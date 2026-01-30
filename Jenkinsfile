pipeline {
  agent any

  tools {
    nodejs 'node24'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  environment {
    DOCKERHUB_NAMESPACE = "tareqjoy"
    DOCKER_CREDS_ID     = "dockerhub-creds"
    KUBECONFIG_CRED_ID  = "kubeconfig"
    K8S_NAMESPACE       = "default"
    SERVICES_DIR        = "src"
    ALLOWED_SERVICES    = "timeline-service,user-service,follower-service,fanout-service,post-service,search-service,auth-service,frontend-service,file-service"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD > .gitsha'
        script { env.GIT_SHA = readFile('.gitsha').trim() }
      }
    }

    stage('Detect changed services') {
      steps {
        script {
          String base = null

          if (env.CHANGE_ID) {
            sh "git fetch --no-tags --prune origin +refs/heads/${env.CHANGE_TARGET}:refs/remotes/origin/${env.CHANGE_TARGET}"
            base = sh(returnStdout: true, script: "git merge-base HEAD origin/${env.CHANGE_TARGET}").trim()
            echo "PR build detected (CHANGE_ID=${env.CHANGE_ID}), base=${base}"
          } else {
            def hasHead1 = (sh(returnStatus: true, script: "git rev-parse HEAD~1 >/dev/null 2>&1") == 0)
            base = hasHead1 ? "HEAD~1" : null
            echo "Non-PR build, base=${base ?: 'ALL'}"
          }

          String changed
          if (base) {
            changed = sh(returnStdout: true, script: "git diff --name-only ${base} HEAD").trim()
          } else {
            changed = sh(returnStdout: true, script: "find ${env.SERVICES_DIR} -maxdepth 2 -name package.json -print | sed 's|/package.json||'").trim()
          }

          def allowed = (env.ALLOWED_SERVICES ?: "")
            .split(',')
            .collect { it.trim() }
            .findAll { it }
            .toSet()

          def services = [] as Set
          if (changed) {
            changed.split('\n').each { p ->
              def m = (p =~ /^${env.SERVICES_DIR}\/([^\/]+)\//)
              if (m) {
                def svc = m[0][1]
                if (allowed.contains(svc)) {
                  services << svc
                }
              }
            }
          }

          env.CHANGED_SERVICES = services.join(',')
          echo "Changed services (allowed only): ${env.CHANGED_SERVICES}"
        }
      }
    }

    stage('Apply platform + changed services (master only)') {
      when { branch 'master' }
      steps {
        withCredentials([file(credentialsId: env.KUBECONFIG_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
          withEnv(["NS=${env.K8S_NAMESPACE}"]) {
            sh '''
              set -euo pipefail
              export KUBECONFIG="$KUBECONFIG_FILE"
              kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

              # shared resources
              kubectl -n "$NS" apply -k envs/prod-platform

              # only changed services
              if [ -n "${CHANGED_SERVICES:-}" ]; then
                IFS=',' read -ra SVCS <<< "$CHANGED_SERVICES"
                for svc in "${SVCS[@]}"; do
                  kubectl -n "$NS" apply -k "src/${svc}/k8s/overlays/prod"
                done
              else
                echo "No changed services to apply"
              fi
            '''
          }
        }
      }
    }

    stage('Per-service pipeline') {
      steps {
        script {
          def allowed = (env.ALLOWED_SERVICES ?: '')
            .split(',')
            .collect { it.trim() }
            .findAll { it }

          def changed = (env.CHANGED_SERVICES ?: '')
            .split(',')
            .collect { it.trim() }
            .findAll { it }
            .toSet()

          def fanout = [:]

          allowed.each { svc ->
            fanout[svc] = {
              if (!changed.contains(svc)) {
                stage("${svc} (skipped)") {
                  echo "No changes for ${svc}, skipping"
                }
                return
              }

              stage("CI: ${svc}") {
                dir("${env.SERVICES_DIR}/${svc}") {
                  if (svc == 'frontend-service') {
                    sh '''
                      set -euxo pipefail
                      node -v
                      npm -v
                      npm ci
                      npm test --if-present
                      NODE_ENV=production npm run build --if-present
                    '''
                  } else {
                    sh '''
                      set -euxo pipefail
                      node -v
                      npm -v
                      npm ci
                      npm test --if-present
                      npm run build --if-present
                    '''
                  }
                }
              }

              if (env.BRANCH_NAME == 'master' && !env.CHANGE_ID) {
                stage("Docker: ${svc}") {
                  docker.withRegistry('https://index.docker.io/v1/', env.DOCKER_CREDS_ID) {
                    def image = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.GIT_SHA}"
                    sh """
                      docker build -t ${image} ${env.SERVICES_DIR}/${svc}
                      docker push ${image}
                    """
                  }
                }

                stage("Deploy: ${svc}") {
                  withCredentials([file(credentialsId: env.KUBECONFIG_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    def image = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.GIT_SHA}"
                    withEnv(["SVC=${svc}", "IMAGE=${image}", "NS=${env.K8S_NAMESPACE}"]) {
                      sh '''
                        set -euo pipefail
                        export KUBECONFIG="$KUBECONFIG_FILE"
                        cd "src/$SVC/k8s/overlays/prod"
                        kustomize edit set image "$DOCKERHUB_NAMESPACE/$SVC=$IMAGE"
                        kubectl -n "$NS" apply -k .
                        kubectl -n "$NS" rollout status "deploy/$SVC" --timeout=180s
                      '''
                    }
                  }
                }
              }
            }
          }

          parallel fanout
        }
      }
    }


  }

  post {
    always {
      sh 'docker image prune -f >/dev/null 2>&1 || true'
    }
  }
}

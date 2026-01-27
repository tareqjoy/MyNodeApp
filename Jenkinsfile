pipeline {
  agent any

  tools {
    nodejs 'node24'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(false)
  }

  environment {
    DOCKERHUB_NAMESPACE = "tareqjoy"
    DOCKER_CREDS_ID     = "dockerhub-creds"
    KUBECONFIG_CRED_ID  = "kubeconfig"
    K8S_NAMESPACE       = "default"
    SERVICES_DIR        = "src"
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
          // For a single-branch master setup:
          // Compare with previous commit. On the first build, fall back to all services.
          def base = sh(returnStatus: true, script: "git rev-parse HEAD~1 >/dev/null 2>&1") == 0 ? "HEAD~1" : ""
          def diffCmd = base ? "git diff --name-only ${base} HEAD" : "find ${env.SERVICES_DIR} -maxdepth 2 -name package.json -print | sed 's|/package.json||'"
          def changed = sh(returnStdout: true, script: diffCmd).trim()

          def services = [] as Set

          if (base) {
            changed.split('\n').each { p ->
              // Match: src/<service>/...
              def m = (p =~ /^${env.SERVICES_DIR}\/([^\/]+)\//)
              if (m) { services << m[0][1] }
            }
          } else {
            // first build: treat every service dir as changed
            changed.split('\n').each { p ->
              def m = (p =~ /^${env.SERVICES_DIR}\/([^\/]+)$/)
              if (m) { services << m[0][1] }
            }
          }

          // If shared root files change and you want to rebuild all, add logic here.
          // Example: if package-lock at root changes -> rebuild all.

          env.CHANGED_SERVICES = services.join(',')
          echo "Changed services: ${env.CHANGED_SERVICES}"
        }
      }
    }

    stage('CI + Build + Push (changed services)') {
      when { expression { return env.CHANGED_SERVICES?.trim() } }
      steps {
        script {
          def svcList = env.CHANGED_SERVICES.split(',').findAll { it?.trim() }
          def fanout = [:]

          svcList.each { svc ->
            fanout[svc] = {
              def svcPath = "${env.SERVICES_DIR}/${svc}"
              stage("CI: ${svc}") {
                dir(svcPath) {
                  sh """
                    set -euxo pipefail
                    node -v
                    npm -v
                    npm ci
                    npm test --if-present
                    npm run build --if-present
                  """
                }
              }

              stage("Docker build/push: ${svc}") {
                docker.withRegistry('https://index.docker.io/v1/', env.DOCKER_CREDS_ID) {
                  def image = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.GIT_SHA}"
                  sh """
                    set -euxo pipefail
                    docker build -t ${image} ${svcPath}
                    docker push ${image}
                  """
                }
              }
            }
          }

          parallel fanout
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { expression { return env.CHANGED_SERVICES?.trim() } }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          script {
            def svcList = env.CHANGED_SERVICES.split(',').findAll { it?.trim() }

            sh """
              set -euxo pipefail
              export KUBECONFIG=${KUBECONFIG_FILE}
              kubectl get ns ${K8S_NAMESPACE} >/dev/null 2>&1 || kubectl create ns ${K8S_NAMESPACE}
              kubectl -n ${K8S_NAMESPACE} apply -f kubernetes/my-node-app-pod.yml
            """

            svcList.each { svc ->
              def image = "${DOCKERHUB_NAMESPACE}/${svc}:${GIT_SHA}"
              sh """
                set -euxo pipefail
                export KUBECONFIG=${KUBECONFIG_FILE}
                kubectl -n ${K8S_NAMESPACE} set image deploy/${svc} ${svc}=${image} --record=true
                kubectl -n ${K8S_NAMESPACE} rollout status deploy/${svc} --timeout=180s
              """
            }
          }
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

def ci

pipeline {
  agent any

  tools {
    nodejs 'node24'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    timeout(time: 45, unit: 'MINUTES')
  }

  environment {
    DOCKERHUB_NAMESPACE = "tareqjoy"
    DOCKER_CREDS_ID     = "dockerhub-creds"
    KUBECONFIG_CRED_ID  = "kubeconfig"
    K8S_NAMESPACE       = "default"
    SERVICES_DIR        = "src"
    ALLOWED_SERVICES    = "timeline-service,user-service,follower-service,fanout-service,post-service,search-service,auth-service,frontend-service,file-service"
    KUBECTL_VERSION     = ""
    KUSTOMIZE_VERSION   = ""
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD > .gitsha'
        script { env.GIT_SHA = readFile('.gitsha').trim() }
        script { ci = load 'scripts/ci/jenkins/lib.groovy' }
      }
    }

    stage('Detect changed services') {
      steps {
        script {
          env.CHANGED_SERVICES = ci.detectChangedServices()
          echo "Changed services (allowed only): ${env.CHANGED_SERVICES}"
        }
      }
    }

    stage('Deploy platform (master only)') {
      when { branch 'master' }
      steps {
        script {
          withCredentials([file(credentialsId: env.KUBECONFIG_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
            withEnv(["K8S_NAMESPACE=${env.K8S_NAMESPACE}", "KUBECONFIG_FILE=${KUBECONFIG_FILE}"]) {
              retry(2) {
                ci.deployPlatform()
              }
            }
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
                  ci.buildService(svc)
                }
              }

              if (env.BRANCH_NAME == 'master' && !env.CHANGE_ID) {
                stage("Docker: ${svc}") {
                  docker.withRegistry('https://index.docker.io/v1/', env.DOCKER_CREDS_ID) {
                    retry(2) {
                      ci.dockerBuildPush(svc)
                    }
                  }
                }

                stage("Deploy: ${svc}") {
                  withCredentials([file(credentialsId: env.KUBECONFIG_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    withEnv([
                      "K8S_NAMESPACE=${env.K8S_NAMESPACE}",
                      "KUBECONFIG_FILE=${KUBECONFIG_FILE}",
                      "DOCKERHUB_NAMESPACE=${env.DOCKERHUB_NAMESPACE}",
                      "GIT_SHA=${env.GIT_SHA}",
                      "KUBECTL_VERSION=${env.KUBECTL_VERSION}",
                      "KUSTOMIZE_VERSION=${env.KUSTOMIZE_VERSION}"
                    ]) {
                      retry(2) {
                        ci.deployService(svc)
                      }
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

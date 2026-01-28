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
    NODE_ENV            = 'production'
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
            // PR build: diff against target branch merge-base
            sh "git fetch --no-tags --prune origin +refs/heads/${env.CHANGE_TARGET}:refs/remotes/origin/${env.CHANGE_TARGET}"
            base = sh(returnStdout: true, script: "git merge-base HEAD origin/${env.CHANGE_TARGET}").trim()
            echo "PR build detected (CHANGE_ID=${env.CHANGE_ID}), base=${base}"
          } else {
            // Branch build (master): diff last commit (simple and safe)
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

          def services = [] as Set
          if (changed) {
            changed.split('\n').each { p ->
              def m = (p =~ /^${env.SERVICES_DIR}\/([^\/]+)\//)
              if (m) { services << m[0][1] }
            }
          }

          env.CHANGED_SERVICES = services.join(',')
          echo "Changed services: ${env.CHANGED_SERVICES}"
        }
      }
    }

    stage('CI (changed services)') {
      when { expression { return env.CHANGED_SERVICES?.trim() } }
      steps {
        script {
          def svcList = env.CHANGED_SERVICES.split(',').findAll { it?.trim() }
          def fanout = [:]

          svcList.each { svc ->
            fanout[svc] = {
              dir("${env.SERVICES_DIR}/${svc}") {
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
          }
          parallel fanout
        }
      }
    }

    stage('Docker build + push (master only)') {
      when {
        allOf {
          branch 'master'
          not { changeRequest() }
          expression { return env.CHANGED_SERVICES?.trim() }
        }
      }
      steps {
        script {
          def svcList = env.CHANGED_SERVICES.split(',').findAll { it?.trim() }
          docker.withRegistry('https://index.docker.io/v1/', env.DOCKER_CREDS_ID) {
            svcList.each { svc ->
              def svcPath = "${env.SERVICES_DIR}/${svc}"
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
    }

    stage('Deploy to Kubernetes') {
      when {
        allOf {
          branch 'master'
          not { changeRequest() }
          expression { return env.CHANGED_SERVICES?.trim() }
        }
      }
      steps {
        withCredentials([file(credentialsId: env.KUBECONFIG_CRED_ID, variable: 'KUBECONFIG_FILE')]) { 
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

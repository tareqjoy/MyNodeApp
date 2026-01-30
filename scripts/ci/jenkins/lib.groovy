def detectChangedServices() {
  return dir(env.WORKSPACE) {
    sh(returnStdout: true, script: 'bash scripts/ci/detect-changes.sh').trim()
  }
}

def buildService(String svc) {
  dir(env.WORKSPACE) {
    sh "bash scripts/ci/build-service.sh ${svc}"
  }
}

def dockerBuildPush(String svc) {
  dir(env.WORKSPACE) {
    sh "bash scripts/ci/docker-build-push.sh ${svc}"
  }
}

def deployPlatform() {
  dir(env.WORKSPACE) {
    sh 'bash scripts/ci/deploy-platform.sh'
  }
}

def deployService(String svc) {
  dir(env.WORKSPACE) {
    sh "bash scripts/ci/deploy-service.sh ${svc}"
  }
}

return this

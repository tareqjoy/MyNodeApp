# Build stage
FROM eclipse-temurin:11-jdk AS build

WORKDIR /workspace

COPY . .

RUN ./gradlew --no-daemon :app:shadowJar

# Runtime stage (Flink base image)
FROM flink:1.20.3-java11

COPY --from=build /workspace/app/build/libs/*-fat.jar /opt/flink/usrlib/app.jar

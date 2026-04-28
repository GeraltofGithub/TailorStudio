### Build stage
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache deps first
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Build
COPY src ./src
RUN mvn -q -DskipTests package

### Runtime stage (small JRE)
FROM eclipse-temurin:17-jre
WORKDIR /app

# Render sets PORT; Spring uses server.port=${PORT:8081}
ENV PORT=8081

# Better defaults for small instances
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=25 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8081
CMD ["java","-jar","/app/app.jar"]


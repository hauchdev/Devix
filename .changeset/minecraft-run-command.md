---
"@devix-cli/minecraft": minor
"devix-cli": minor
---

Add `devix minecraft run`, a print-first command that recommends how to launch a scaffolded project. It detects the platform, checks for the Gradle wrapper and suggests `./gradlew runClient`, `./gradlew runServer` or `./gradlew build` depending on the project kind.

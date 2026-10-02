import {
  extraModules,
  moduleArtifactId,
  type TemplateContext,
  type TemplateFile,
} from "./types.js";

/**
 * Parent aggregator `pom.xml` of a Maven multi-module project: one
 * `<module>` entry per extra module, shared properties and compiler
 * release for the whole reactor.
 */
export function renderMavenParentPom(context: TemplateContext, projectSlug: string): string {
  const java = context.versions[0]?.javaVersion ?? 21;
  const moduleEntries = extraModules(context).map((module) => `        <module>${module}</module>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xmlns="http://maven.apache.org/POM/4.0.0"',
    '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
    "    <modelVersion>4.0.0</modelVersion>",
    "",
    `    <groupId>${context.packageName}</groupId>`,
    `    <artifactId>${projectSlug}-parent</artifactId>`,
    `    <version>${context.version}</version>`,
    "    <packaging>pom</packaging>",
    "",
    "    <properties>",
    `        <maven.compiler.release>${java}</maven.compiler.release>`,
    "        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>",
    "    </properties>",
    "",
    "    <modules>",
    ...moduleEntries,
    "    </modules>",
    "</project>",
    "",
  ].join("\n");
}

/**
 * The `pom.xml` of one Maven module: the entrypoint module keeps the
 * plain slug (`mymod`); extras are suffixed (`mymod-api`, `mymod-core`).
 */
export function renderMavenModulePom(
  context: TemplateContext,
  projectSlug: string,
  module: string,
  isMain: boolean,
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xmlns="http://maven.apache.org/POM/4.0.0"',
    '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
    "    <modelVersion>4.0.0</modelVersion>",
    "",
    "    <parent>",
    `        <groupId>${context.packageName}</groupId>`,
    `        <artifactId>${projectSlug}-parent</artifactId>`,
    `        <version>${context.version}</version>`,
    "    </parent>",
    "",
    `    <artifactId>${moduleArtifactId(module, isMain, projectSlug)}</artifactId>`,
    "    <packaging>jar</packaging>",
    "",
    "    <dependencies>",
    ...(isMain
      ? []
      : [
          "        <dependency>",
          `            <groupId>${context.packageName}</groupId>`,
          `            <artifactId>${projectSlug}</artifactId>`,
          `            <version>${context.version}</version>`,
          "        </dependency>",
        ]),
    "    </dependencies>",
    "</project>",
    "",
  ].join("\n");
}

/** The `pom.xml` used by single-module Maven scaffolds (no parent). */
export function renderStandaloneMavenPom(
  context: TemplateContext,
  projectSlug: string,
  dependenciesXml: readonly string[],
  repositoriesXml: readonly string[],
): string {
  const java = context.versions[0]?.javaVersion ?? 21;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xmlns="http://maven.apache.org/POM/4.0.0"',
    '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
    "    <modelVersion>4.0.0</modelVersion>",
    "",
    `    <groupId>${context.packageName}</groupId>`,
    `    <artifactId>${projectSlug}</artifactId>`,
    `    <version>${context.version}</version>`,
    "    <packaging>jar</packaging>",
    "",
    "    <properties>",
    `        <maven.compiler.release>${java}</maven.compiler.release>`,
    "        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>",
    "    </properties>",
    "",
    ...(repositoriesXml.length > 0
      ? ["    <repositories>", ...repositoriesXml, "    </repositories>", ""]
      : []),
    ...(dependenciesXml.length > 0
      ? ["    <dependencies>", ...dependenciesXml, "    </dependencies>", ""]
      : []),
    "</project>",
    "",
  ].join("\n");
}

/** Extra module poms for Maven multi-module scaffolds. */
export function renderMavenExtraModulePoms(
  context: TemplateContext,
  projectSlug: string,
): TemplateFile[] {
  return extraModules(context).map((module) => ({
    path: `${module}/pom.xml`,
    contents: renderMavenModulePom(context, projectSlug, module, false),
  }));
}

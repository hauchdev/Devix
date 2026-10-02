#!/usr/bin/env node
/**
 * Validates the Minecraft version catalog JSON.
 *
 * Run from the plugin root:
 *   node scripts/validate-catalog.mjs
 *
 * Returns exit code 0 when the catalog is valid, 1 otherwise.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(__dirname, "..", "catalog", "versions.json");

const PLATFORM_KEYS = [
  "fabric",
  "neoforge",
  "forge",
  "architectury",
  "paper",
  "spigot",
  "velocity",
  "bungeecord",
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function validate() {
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch (error) {
    fail(`catalog/versions.json is not valid JSON: ${error}`);
    return;
  }

  if (typeof catalog.default !== "string" || catalog.default.length === 0) {
    fail("'default' must be a non-empty string");
  }

  if (!Array.isArray(catalog.versions)) {
    fail("'versions' must be an array");
    return;
  }

  if (catalog.versions.length === 0) {
    fail("'versions' must not be empty");
  }

  const seenMinecraft = new Set();
  const seenAliases = new Set();

  for (const spec of catalog.versions) {
    if (typeof spec.minecraft !== "string" || spec.minecraft.length === 0) {
      fail("each version entry needs a non-empty 'minecraft' string");
      continue;
    }

    if (seenMinecraft.has(spec.minecraft)) {
      fail(`duplicate Minecraft version: ${spec.minecraft}`);
    }
    seenMinecraft.add(spec.minecraft);

    if (!Array.isArray(spec.aliases)) {
      fail(`${spec.minecraft}: 'aliases' must be an array`);
    } else {
      for (const alias of spec.aliases) {
        if (seenAliases.has(alias)) {
          fail(`${spec.minecraft}: duplicate alias '${alias}'`);
        }
        seenAliases.add(alias);
      }
    }

    if (typeof spec.label !== "string" || spec.label.length === 0) {
      fail(`${spec.minecraft}: 'label' must be a non-empty string`);
    }

    if (typeof spec.javaVersion !== "number") {
      fail(`${spec.minecraft}: 'javaVersion' must be a number`);
    }

    if (typeof spec.loom !== "string") {
      fail(`${spec.minecraft}: 'loom' must be a string`);
    }

    for (const key of PLATFORM_KEYS) {
      const value = spec[key];
      if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
        fail(`${spec.minecraft}: '${key}' must be an object or null`);
      }
    }
  }

  if (!seenMinecraft.has(catalog.default) && !seenAliases.has(catalog.default)) {
    fail(`default version '${catalog.default}' is not a known minecraft id or alias`);
  }

  if (process.exitCode === undefined) {
    console.log(`✅ Catalog is valid (${catalog.versions.length} version(s)).`);
  }
}

validate();

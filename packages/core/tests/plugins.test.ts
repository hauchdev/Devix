import { describe, expect, it } from "vitest";

import { PluginError } from "../src/plugin-error.js";
import { PluginRegistry, type PluginManifest } from "../src/plugins.js";

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "docker",
    name: "Docker",
    version: "0.0.1",
    description: "Docker integration for Devix.",
    ...overrides,
  };
}

describe("PluginRegistry", () => {
  it("registers plugins and preserves order", () => {
    const registry = new PluginRegistry((m) => PluginError.invalid(m));

    registry.register(manifest());
    registry.register(manifest({ id: "github", name: "GitHub" }));

    expect(registry.ids()).toEqual(["docker", "github"]);
    expect(registry.all().map((p) => p.manifest.id)).toEqual(["docker", "github"]);
  });

  it("supports registerAll and has()", () => {
    const registry = new PluginRegistry((m) => PluginError.invalid(m));

    registry.registerAll([manifest(), manifest({ id: "github", name: "GitHub" })]);

    expect(registry.has("docker")).toBe(true);
    expect(registry.has("missing")).toBe(false);
  });

  it("rejects duplicate ids with EDUPLICATE", () => {
    const registry = new PluginRegistry((m) => PluginError.invalid(m));
    registry.register(manifest());

    expect(() => registry.register(manifest())).toThrowError(PluginError);
    expect(() => registry.register(manifest())).toThrowError(/already registered/);
  });

  it("rejects invalid ids, versions and empty strings", () => {
    const registry = new PluginRegistry((m) => PluginError.invalid(m));

    expect(() => registry.register(manifest({ id: "Docker" }))).toThrowError(PluginError);
    expect(() => registry.register(manifest({ id: "" }))).toThrowError(PluginError);
    expect(() => registry.register(manifest({ version: "not-semver" }))).toThrowError(PluginError);
    expect(() => registry.register(manifest({ name: "" }))).toThrowError(PluginError);
    expect(() => registry.register(manifest({ description: " " }))).toThrowError(PluginError);
  });

  it("accepts pre-release and build metadata versions", () => {
    const registry = new PluginRegistry((m) => PluginError.invalid(m));

    expect(() =>
      registry.register(manifest({ id: "alpha", name: "Alpha", version: "1.0.0-beta.1+build" })),
    ).not.toThrow();
  });
});

import { readFileString } from "@devix-cli/filesystem";

/**
 * Reads a manifest file and returns the first capture group of
 * `pattern`, trimmed and without surrounding quotes.
 *
 * Read errors and malformed manifests are not detection failures: the
 * marker still counts and the detail is simply absent, matching the
 * package-wide rule that "malformed is detected, without details".
 */
export async function readManifestDetail(
  path: string,
  pattern: RegExp,
): Promise<string | undefined> {
  const content = await readFileString(path).catch(() => undefined);
  const match = content === undefined ? undefined : pattern.exec(content)?.[1];
  const detail = match?.trim();
  if (detail === undefined || detail.length === 0) {
    return undefined;
  }
  return detail.replace(/^["']|["']$/g, "");
}

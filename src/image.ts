/**
 * Splits an image reference into its parts. The tag is only looked for in the last path
 * segment, so a registry port (`localhost:5000/img`) is not mistaken for a tag.
 */
export function parseImage(image: string): { name: string; tag?: string; digest?: string } {
    let rest = image;
    let digest: string | undefined;
    const at = rest.indexOf('@');
    if (at !== -1) {
        digest = rest.slice(at + 1);
        rest = rest.slice(0, at);
    }
    const lastSlash = rest.lastIndexOf('/');
    const colon = rest.indexOf(':', lastSlash + 1);
    if (colon === -1) return { name: rest, digest };
    return { name: rest.slice(0, colon), tag: rest.slice(colon + 1), digest };
}

export const visualViewports = [
  { label: "laptop", width: 1280, height: 832 },
  { label: "mobile", width: 390, height: 844 },
];

export function screenshotName(path: string, viewportLabel: string) {
  const routeName = path === "/" ? "home" : path.replace(/^\//, "").replaceAll("/", "-");
  return `${routeName}.${viewportLabel}.png`;
}

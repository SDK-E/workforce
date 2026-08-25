export interface WorkforceTheme {
  id: string;
  name: string;
  colors: {
    canvas: "black" | "white";
    surface: "black" | "white" | "gray";
    primary: "blue" | "cyan" | "magenta" | "white";
    accent: "cyan" | "green" | "yellow" | "white";
    border: "gray" | "white" | "cyan";
    success: "green" | "cyan" | "white";
    warning: "yellow" | "magenta" | "white";
    danger: "red" | "magenta" | "white";
    text: "white" | "black";
  };
}

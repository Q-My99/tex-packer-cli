declare module "@jvitela/mustache-wax" {
  import type mustache from "mustache";
  export default function wax(instance: typeof mustache): void;
}

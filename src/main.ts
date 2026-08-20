import "./style.css";
import { mountApplication } from "./ui/app.ts";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("O elemento principal da aplicação não foi encontrado.");
}

mountApplication(app);

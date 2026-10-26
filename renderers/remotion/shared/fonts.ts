import { loadFont } from "@remotion/fonts";
import semiBold from "../../../assets/fonts/BeVietnamPro-SemiBold.ttf";
import extraBold from "../../../assets/fonts/BeVietnamPro-ExtraBold.ttf";

// Be Vietnam Pro (giấy phép OFL, xem assets/licenses): đủ dấu tiếng Việt.
// Font nằm sẵn trong repo nên render không cần mạng.
export const BE_VIETNAM_PRO = "Be Vietnam Pro";

loadFont({ family: BE_VIETNAM_PRO, url: semiBold, weight: "600" });
loadFont({ family: BE_VIETNAM_PRO, url: extraBold, weight: "800" });

export function resolveFont(name: string): string {
  return `"${name}", sans-serif`;
}

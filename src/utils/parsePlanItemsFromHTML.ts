import { JSDOM } from "jsdom";

interface PlanDayData {
  day: string;
  sections: PlanDaySectionData[];
}

interface PlanDaySectionData {
  title: string;
  sections: string[];
}

export function parsePlanItemsFromHTML(html: string): PlanDayData[] {
  console.log("Parsing plan items from HTML: \n", html, "\n\n");
  // Initialize variables to store the result
  const result: PlanDayData[] = [];

  // Create a DOM from the HTML content
  const dom = new JSDOM(html);

  // Get the table body element
  const tableBody = dom.window.document.querySelector("table tbody");

  if (tableBody) {
    // Get all rows in the table body
    const rows = tableBody.querySelectorAll("tr");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const columns = row.querySelectorAll("td");

      const day = columns[0].innerHTML ?? "";
      const dayContent = (columns[1].innerHTML ?? "").split("<br>");

      let dayObject: PlanDayData = {
        day,
        sections: [],
      };

      let currentSection: PlanDaySectionData = {
        title: "",
        sections: [],
      };
      for (
        let dayContentIndex = 0;
        dayContentIndex < dayContent.length;
        dayContentIndex++
      ) {
        const content = dayContent[dayContentIndex].trim();
        if (content !== "" && content.endsWith(":")) {
          if (currentSection.title !== "") {
            dayObject.sections.push(currentSection);
          }
          currentSection = {
            title: content.replaceAll(":", "").replaceAll("-", "").trim(),
            sections: [],
          };
        } else if (content !== "") {
          currentSection.sections.push(
            content.replaceAll("-", "").replaceAll("<br>", "").trim()
          );
        }
      }
      if (currentSection.title !== "") {
        dayObject.sections.push(currentSection);
      }

      if (dayObject) {
        result.push(dayObject);
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
  return result;
}

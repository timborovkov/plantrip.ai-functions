export function generateHTMLTable(responseText: string): string {
  const dayPattern = /Day (\d+):([\s\S]*?)(?=Day \d+:|$)/g;
  let match;
  let table =
    "<table><thead><tr><th>Day</th><th>Activities</th></tr></thead><tbody>";

  while ((match = dayPattern.exec(responseText)) !== null) {
    const dayNumber = match[1];
    const activitiesText = match[2]
      .trim()
      .split("\n")
      .map((activity) => activity.trim())
      .join("<br/>")
      .replaceAll("- ", "<br/>- ")
      .replaceAll("• ", "<br/>• ")
      .replaceAll(": ", ":<br/>");

    table += `<tr><td>Day ${dayNumber}</td><td>${activitiesText}</td></tr>`;
  }

  table += "</tbody></table>";

  return table;
}

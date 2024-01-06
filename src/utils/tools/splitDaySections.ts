export default function splitDayIntoSections(text: string) {
  // Split the text into sections based on the titles (e.g., "Morning:", "Afternoon/Evening:")
  const sections = text.split(/\n(?=\w+:)/);

  // Define a regular expression pattern to match the title
  const titlePattern = /(\w+):/;

  // Initialize an array to store the result
  const result = [];

  let currentTitle = "";
  let currentSections = [];

  // Iterate through the sections and extract titles and content
  for (const section of sections) {
    const match = section.match(titlePattern);
    if (match) {
      if (currentTitle !== "") {
        result.push({ title: currentTitle, sections: currentSections });
        currentSections = [];
      }
      currentTitle = match[1];
    }
    const content = section.replace(titlePattern, "").trim();
    currentSections.push(content);
  }

  // Push the last set of sections
  if (currentTitle !== "") {
    result.push({ title: currentTitle, sections: currentSections });
  }

  return result;
}

export default function splitDayInToSections(text: string) {
  // Split the text into sections based on the titles (e.g., "Morning:", "Afternoon/Evening:")
  const sections = text.split(/\n(?=\w+:)/);

  // Define a regular expression pattern to match the title
  const titlePattern = /(\w+):/;

  // Initialize an array to store the result
  const result = [];

  // Iterate through the sections and extract titles and content
  for (const section of sections) {
    const match = section.match(titlePattern);
    if (match) {
      const title = match[1];
      const content = section.replace(titlePattern, "").trim();
      result.push({ title, content });
    }
  }
  return result;
}

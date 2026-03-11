// CODE CREATED BY MATIAS GARCIA FOR VML ARGENTINA FORD QA TEAM
// This script triggers a download of vehicle specifications or options data from the current webpage.
// It detects whether the page is a Ford Build & Price (FBC) page or a regular vehicle page and extracts data accordingly.

try {
  // We use the button ID to report back to the pop-up which button needs a UI update.
  const buttonId = "btn-data_exporter_options";

  // Detectar si estamos en una página FBC o en una página regular
  const isFBCPage = document.querySelector("ford-accordion") !== null;

  let extractedData;
  if (isFBCPage) {
    extractedData = extractFBCOptions();
  } else {
    extractedData = extractVehicleOptions();
  }

  if (extractedData && extractedData.length > 0) {
    chrome.runtime.sendMessage({
      action: "export_data",
      data: extractedData,
      buttonId: buttonId,
      tool: "options_exporter",
    });
  } else {
    chrome.runtime.sendMessage({
      action: "export_error",
      error: "No options data could be extracted.",
      buttonId: buttonId,
    });
  }
} catch (error) {
  const buttonId = "btn-data_exporter_options";
  chrome.runtime.sendMessage({
    action: "export_error",
    error: error.message,
    buttonId: buttonId,
  });
}

// Función original para extraer opciones de vehículos
function extractVehicleOptions() {
  const optionsData = [];

  try {
    // Find all modals that contain vehicle options
    const modals = document.querySelectorAll(".xf_modal");

    modals.forEach((modal) => {
      try {
        // Get the modal ID to identify the model
        const modalId = modal.id || "";

        // Try to find the model name
        let modelName = "Unknown Model";
        const modelNameElement = modal.querySelector(
          ".cmp-trimoverview__content-title",
        );
        if (modelNameElement) {
          modelName = modelNameElement.textContent.trim();
        } else {
          // Try alternative ways to find model name
          const altModelNameElement = document.querySelector(".modelName");
          if (altModelNameElement) {
            modelName = altModelNameElement.textContent.trim();
          }
        }

        // Find all accordion items for vehicle features
        const accordionItems = modal.querySelectorAll(
          ".cmp-single-item-accordion",
        );

        if (!accordionItems || accordionItems.length === 0) {
          // If no accordion items in modal, try to find them in the current page
          if (
            document.querySelectorAll(".cmp-single-item-accordion").length === 0
          ) {
            throw new Error("No accordion items found on this page");
          }
        }

        // Process accordion items
        accordionItems.forEach((item) => {
          processAccordionItem(item, modelName, optionsData);
        });
      } catch (modalError) {
        console.warn("Error processing modal:", modalError);
        // Continue with next modal
      }
    });

    // If no modals were found or no data was extracted from modals,
    // try to extract from the main page
    if (optionsData.length === 0) {
      // Find all accordion items for vehicle features on the main page
      const accordionItems = document.querySelectorAll(
        ".cmp-single-item-accordion",
      );

      if (!accordionItems || accordionItems.length === 0) {
        // If we found zero data, we return an empty array, which will trigger the error message in the execution block.
        return [];
      }

      // Try to find the model name on the main page
      let modelName = "Unknown Model";
      const modelNameElement = document.querySelector(".modelName");
      if (modelNameElement) {
        modelName = modelNameElement.textContent.trim();
      }

      // Process accordion items
      accordionItems.forEach((item) => {
        processAccordionItem(item, modelName, optionsData);
      });
    }

    if (optionsData.length === 0) {
      // It's better to return an empty array here so the catch block handles the communication.
      return [];
    }

    return optionsData;
  } catch (error) {
    console.error("Error in extractVehicleOptions:", error);
    // Re-throw to be caught by the main execution block
    throw error;
  }
}

function processAccordionItem(item, modelName, optionsData) {
  try {
    // Get accordion name (category)
    const headingElement = item.querySelector(
      ".cmp-single-item-accordion__heading",
    );
    if (!headingElement) return;

    const categoryName = headingElement.textContent.trim();

    // Get content
    const content = item.querySelector(".cmp-single-item-accordion__content");
    if (!content) return;

    // Find the accordion text
    const accordionText = content.querySelector(".accordion-text");
    if (!accordionText) return;

    // Process the content
    let currentSubcategory = "";
    let currentAvailability = "";

    // Improved method to detect structure and extract options
    const allElements = accordionText.querySelectorAll("*");

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];

      // Check for subcategory headers (b tags)
      if (element.tagName === "B") {
        currentSubcategory = element.textContent.trim();
        continue;
      }

      // Check for availability (i tags)
      if (element.tagName === "I") {
        currentAvailability = element.textContent.trim();
        continue;
      }

      // Extract options from list items
      if (element.tagName === "LI") {
        const optionText = element.textContent.trim();

        if (optionText) {
          optionsData.push({
            model: modelName,
            category: categoryName,
            subcategory: currentSubcategory,
            availability: currentAvailability,
            option: optionText,
          });
        }
      }
    }

    // If the above method didn't work well, try the original method
    if (optionsData.length === 0) {
      // Get all child nodes
      const childNodes = accordionText.childNodes;

      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];

        // Check for subcategory headers (bold text in paragraphs)
        if (node.nodeName === "P" && node.querySelector("b")) {
          currentSubcategory = node.querySelector("b").textContent.trim();
          continue;
        }

        // Check for availability (italic text in paragraphs)
        if (node.nodeName === "P" && node.querySelector("i")) {
          currentAvailability = node.querySelector("i").textContent.trim();
          continue;
        }

        // Extract options from unordered lists
        if (node.nodeName === "UL") {
          const listItems = node.querySelectorAll("li");

          listItems.forEach((li) => {
            const optionText = li.textContent.trim();

            if (optionText) {
              optionsData.push({
                model: modelName,
                category: categoryName,
                subcategory: currentSubcategory,
                availability: currentAvailability,
                option: optionText,
              });
            }
          });
        }
      }
    }
  } catch (itemError) {
    console.warn("Error processing accordion item:", itemError);
    // Continue with next item
  }
}

// Nueva función para extraer opciones de FBC
function extractFBCOptions() {
  const optionsData = [];

  try {
    // Buscar todos los acordeones de Ford
    const accordions = document.querySelectorAll("ford-accordion");

    if (!accordions || accordions.length === 0) {
      // If we found zero data, we return an empty array, which will trigger the error message in the execution block.
      return [];
    }

    // Procesar cada acordeón
    accordions.forEach((accordion) => {
      try {
        // Encontrar el modelo asociado a este acordeón
        let modelName = "Unknown Model";

        // Buscar el nombre del modelo en el contenedor padre
        const parentElement =
          accordion.closest('[class*="modal"]') || accordion.parentElement;
        if (parentElement) {
          const modelNameElement = parentElement.querySelector(".model-name");
          if (modelNameElement) {
            modelName = modelNameElement.textContent.trim();
          }
        }

        // Obtener el contenido del acordeón desde el atributo content
        const contentAttr = accordion.getAttribute("content");
        if (!contentAttr) return;

        // Parsear el contenido JSON
        let content;
        try {
          content = JSON.parse(contentAttr);
        } catch (e) {
          console.error("Error parsing accordion content:", e);
          return;
        }

        // Procesar cada categoría
        content.forEach((category) => {
          const categoryName = category.name;

          // Procesar cada elemento (opción) en la categoría
          category.items.forEach((item) => {
            const optionText = cleanHtmlTags(item.name);

            // Todas las opciones en FBC son estándar
            optionsData.push({
              model: modelName,
              category: categoryName,
              subcategory: "", // No hay subcategorías en FBC
              availability: "Standard", // Todas son estándar
              option: optionText,
            });
          });
        });
      } catch (accordionError) {
        console.warn("Error processing accordion:", accordionError);
        // Continue with next accordion
      }
    });

    if (optionsData.length === 0) {
      return [];
    }

    return optionsData;
  } catch (error) {
    console.error("Error in extractFBCOptions:", error);
    throw error;
  }
}

// Función auxiliar para limpiar etiquetas HTML
function cleanHtmlTags(text) {
  if (!text) return "";

  // Crear un elemento temporal
  const tempElement = document.createElement("div");
  tempElement.innerHTML = text;

  // Devolver el texto sin etiquetas HTML
  return tempElement.textContent || tempElement.innerText || "";
}

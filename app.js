"use strict";

const PALETTES = {
  wilga: {tekst: "#13864E", tlo: "#FFFFFF"},
  negatyw: {tekst: "#FFFFFF", tlo: "#13864E"},
  granat: {tekst: "#183D57", tlo: "#F7F4E9"},
  bordo: {tekst: "#742E39", tlo: "#FFF8F0"},
  grafit: {tekst: "#26332E", tlo: "#F2C94C"}
};
const LOCALITIES = [
  "Bączki", "Borowina", "Celejów", "Cyganówka", "Goźlin Górny",
  "Goźlin Mały", "Holendry", "Komisja", "Malinówka", "Mariańskie Porzecze",
  "Nieciecz", "Nowe Podole", "Nowy Żabieniec", "Olszynka", "Osiedle Wilga",
  "Ostrybór", "Podgórze", "Polewicz", "Ruda Tarnowska", "Skurcza",
  "Stare Podole", "Stary Żabieniec", "Tarnów", "Trzcianka",
  "Uścieniec-Kolonia", "Wicie", "Wilga (siedziba gminy)",
  "Wólka Gruszczyńska", "Zakrzew", "Zarzecze", "Garwolin"
];
const SIZES = {
  "40x35": {label: "40 × 35 cm", mm: [400, 350], rodzaj: "adres"},
  "20x17.5": {label: "20 × 17,5 cm", opis: "20 × 17,5 cm (połowa)", mm: [200, 175], rodzaj: "adres"},
  "100x45": {label: "100 × 45 cm", mm: [1000, 450], rodzaj: "ulica"},
  "80x36": {label: "80 × 36 cm", mm: [800, 360], rodzaj: "ulica"}
};
const CANVAS = {width: 1512, height: 1323};
const STREET_CANVAS = {width: 2000, height: 900};
const EXAMPLES = {
  adres: {ulica: "Słoneczna", numer: "12A", opis: "Słoneczna 12A"},
  ulica: {ulica: "Szpaka", numer_lewy: "11", numer_prawy: "1", opis: "Szpaka, numery 11 → 1"}
};
const form = document.querySelector("#sign-form");
const locality = document.querySelector("#locality");
const customLocality = document.querySelector("#custom-locality");
const customLocalityField = document.querySelector("#custom-locality-field");
const crest = document.querySelector("#crest");
const palette = document.querySelector("#palette");
const textColor = document.querySelector("#text-color");
const backgroundColor = document.querySelector("#background-color");
const prefix = document.querySelector("#prefix");
const size = document.querySelector("#size");
const signType = document.querySelector("#type");
const numbers = document.querySelector("#numbers");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save-button");
const downloads = document.querySelector("#downloads");
const paletteWarning = document.querySelector("#palette-warning");
const proofHeading = document.querySelector("#proof-heading");
const proofSubtitle = document.querySelector("#proof-subtitle");
let fontData;
let crests;
let previewUrl;
let previewTimer;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function localityValue() {
  return locality.value === "__custom__" ? customLocality.value.trim() : locality.value;
}

function setLocalityOptions() {
  const fragment = document.createDocumentFragment();
  for (const name of LOCALITIES) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === "Osiedle Wilga") option.selected = true;
    fragment.append(option);
  }
  const custom = document.createElement("option");
  custom.value = "__custom__";
  custom.textContent = "Inna miejscowość…";
  fragment.append(custom);
  locality.replaceChildren(fragment);
}

function updateLocalityControls() {
  const isCustom = locality.value === "__custom__";
  customLocalityField.hidden = !isCustom;
  customLocality.required = isCustom;
  updatePaletteWarning();
}

function updatePaletteWarning() {
  paletteWarning.hidden = !(
    localityValue().toLocaleLowerCase("pl-PL") === "osiedle wilga" &&
    palette.value !== "wilga"
  );
}

function selectSuggestedCrest() {
  crest.value = /garwolin/i.test(localityValue()) ? "garwolin" : "wilga";
}

function updateSwatches() {
  document.querySelector("#swatches").style.setProperty("--swatch-ink", textColor.value);
  document.querySelector("#swatches").style.setProperty("--swatch-paper", backgroundColor.value);
}

function selectPaletteColors() {
  const colors = PALETTES[palette.value];
  if (colors) {
    textColor.value = colors.tekst;
    backgroundColor.value = colors.tlo;
  }
  updatePaletteWarning();
  updateSwatches();
  schedulePreview();
}

function markCustomPalette() {
  palette.value = "wlasna";
  updatePaletteWarning();
  updateSwatches();
  schedulePreview();
}

function setSizeOptions() {
  const previous = size.value;
  size.replaceChildren(...Object.entries(SIZES).filter(([, s]) => s.rodzaj === signType.value)
    .map(([value, s]) => new Option(s.opis || s.label, value)));
  if (SIZES[previous]?.rodzaj === signType.value) size.value = previous;
}

function updateTypeControls() {
  const street = signType.value === "ulica";
  document.querySelector("#number-field").hidden = street;
  form.elements.numer.required = !street;
  document.querySelector("#street-numbers").hidden = !street;
  document.querySelector("#number-range").hidden = !numbers.checked;
  for (const name of ["numer_lewy", "numer_prawy"]) form.elements[name].required = street && numbers.checked;
  document.querySelector("#prefix-label").textContent = street ? "Dodaj skrót „UL.”" : "Dodaj prefiks „ULICA”";
  form.elements.ulica.placeholder = `np. ${EXAMPLES[signType.value].ulica}`;
  setSizeOptions();
}

// Puste pole pokazuje w podglądzie przykład, więc wpisywana nazwa ulicy jest widoczna od pierwszej litery.
function configFromForm() {
  const example = EXAMPLES[signType.value];
  const value = name => form.elements[name].value.trim() || example[name] || "";
  return {
    rodzaj: signType.value,
    ulica: value("ulica"),
    wielkosc_liter: form.elements.wielkosc_liter.value,
    numer: value("numer").toLocaleUpperCase("pl-PL"),
    numery: numbers.checked,
    numer_lewy: value("numer_lewy").toLocaleUpperCase("pl-PL"),
    numer_prawy: value("numer_prawy").toLocaleUpperCase("pl-PL"),
    strzalka: form.elements.strzalka.value,
    miejscowosc: localityValue() || "Osiedle Wilga",
    rozmiar: size.value,
    herb: crest.value,
    prefiks: prefix.checked,
    paleta: palette.value,
    kolor_tekstu: textColor.value.toUpperCase(),
    kolor_tla: backgroundColor.value.toUpperCase()
  };
}

function showPreview(svg, alt, dimension) {
  const nextUrl = URL.createObjectURL(new Blob([svg], {type: "image/svg+xml;charset=utf-8"}));
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = nextUrl;
  preview.src = nextUrl;
  preview.alt = alt;
  preview.hidden = false;
  document.querySelector("#placeholder").hidden = true;
  document.querySelector("#dimension").textContent = dimension;
  const [w, h] = SIZES[size.value].mm;
  const margin = 0.08 * Math.min(w, h);
  document.querySelector(".proof-mat").style.aspectRatio = `${w + margin} / ${h + margin}`;
}

function svgNode(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function glyphWidth(text, glyphs, unitsPerEm, sizePx, letterSpacing) {
  const advance = [...text].reduce((sum, character) => {
    const glyphName = glyphs.characters[character];
    const glyph = glyphName ? glyphs.glyphs[glyphName] : null;
    if (!glyph) throw new Error(`Krój pisma nie zawiera znaku „${character}”.`);
    return sum + glyph.advance;
  }, 0);
  return (advance / unitsPerEm) * sizePx + letterSpacing * Math.max([...text].length - 1, 0);
}

function fitText(text, weight, fontSize, maxWidth, letterSpacing = 0) {
  const font = fontData.weights[String(weight)];
  const width = glyphWidth(text, font, font.unitsPerEm, fontSize, letterSpacing);
  if (width <= maxWidth) return {size: fontSize, width};
  const spacing = letterSpacing * Math.max([...text].length - 1, 0);
  return {size: (maxWidth - spacing) * fontSize / (width - spacing), width: maxWidth};
}

// Rysuje tekst krzywymi od lewej krawędzi x; zwraca szerokość.
function drawText(svg, text, weight, sizePx, x, baseline, color, letterSpacing = 0) {
  const font = fontData.weights[String(weight)];
  glyphWidth(text, font, font.unitsPerEm, sizePx, letterSpacing);  // błąd, gdy krój nie ma znaku
  const scale = sizePx / font.unitsPerEm;
  const start = x;
  for (const character of text) {
    const glyph = font.glyphs[font.characters[character]];
    if (glyph.path) {
      svg.append(svgNode("path", {
        d: glyph.path,
        fill: color,
        transform: `translate(${x.toFixed(2)} ${baseline}) scale(${scale} ${-scale})`
      }));
    }
    x += glyph.advance * scale + letterSpacing;
  }
  return x - letterSpacing - start;
}

function appendText(svg, text, weight, fontSize, baseline, maxWidth, color, letterSpacing = 0, center = CANVAS.width / 2) {
  const fit = fitText(text, weight, fontSize, maxWidth, letterSpacing);
  drawText(svg, text, weight, fit.size, center - fit.width / 2, baseline, color, letterSpacing);
}

function escapeFilename(value) {
  const slug = value.replace(/ł/g, "l").replace(/Ł/g, "L").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return slug || "tabliczka";
}

function svgRoot(config, canvas) {
  const [widthMm, heightMm] = SIZES[config.rozmiar].mm;
  return svgNode("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    viewBox: `0 0 ${canvas.width} ${canvas.height}`
  });
}

function streetName(config) {
  return config.wielkosc_liter === "wielkie"
    ? config.ulica.toLocaleUpperCase("pl-PL")
    : config.wielkosc_liter === "male"
      ? config.ulica.toLocaleLowerCase("pl-PL")
      : config.ulica;
}

function crestImage(config, x, y, width, height) {
  return svgNode("image", {
    x, y, width, height,
    preserveAspectRatio: "xMidYMid meet",
    href: crests[config.herb].dataUrl
  });
}

function buildSvg(config) {
  return config.rodzaj === "ulica" ? buildStreetSvg(config) : buildAddressSvg(config);
}

// Tablica z nazwą ulicy na skrzyżowanie: ramka, „UL.” i nazwa, a w pasku numery ze strzałką, miejscowość i herb.
function buildStreetSvg(config) {
  const {width: W, height: H} = STREET_CANVAS;
  const svg = svgRoot(config, STREET_CANVAS);
  const fg = config.kolor_tekstu;
  const bg = config.kolor_tla;
  const bandTop = 705;
  svg.append(
    svgNode("rect", {width: W, height: H, fill: bg}),
    svgNode("rect", {x: 38, y: 38, width: W - 76, height: H - 76, fill: "none", stroke: fg, "stroke-width": 26}),
    svgNode("rect", {x: 25, y: bandTop, width: W - 50, height: H - 25 - bandTop, fill: fg})
  );

  const street = streetName(config);
  const upper = config.wielkosc_liter === "wielkie";
  const nameSize = upper ? 470 : 420;
  const middle = upper ? 423 : 406;  // środek wysokości wielkich liter; krótsza nazwa i tak ma tu linię pisma 578 / 545
  const prefixSize = 150;
  const gap = 34;
  const font = fontData.weights["500"];
  const nameWidth = glyphWidth(street, font, font.unitsPerEm, nameSize, 0);
  const prefixWidth = config.prefiks ? glyphWidth("UL.", font, font.unitsPerEm, prefixSize, 0) + gap : 0;
  const scale = Math.min(1, 1760 / (nameWidth + prefixWidth));
  const baseline = middle + 0.33 * nameSize * scale;
  let x = (W - (nameWidth + prefixWidth) * scale) / 2;
  if (config.prefiks) x += drawText(svg, "UL.", 500, prefixSize * scale, x, baseline, fg) + gap * scale;
  drawText(svg, street, 500, nameSize * scale, x, baseline, fg);

  const numBaseline = 822;
  if (config.numery) {
    let nx = 70;
    nx += drawText(svg, config.numer_lewy, 500, 92, nx, numBaseline, bg) + 22;
    const length = 96;
    const y = numBaseline - 33;
    const left = config.strzalka === "lewo";
    const tip = left ? nx : nx + length;
    const tail = left ? nx + length : nx;
    const head = left ? 30 : -30;
    svg.append(svgNode("path", {
      d: `M${tail} ${y - 6}H${tip + head}V${y - 20}L${tip} ${y}L${tip + head} ${y + 20}V${y + 6}H${tail}Z`,
      fill: bg
    }));
    nx += length + 22;
    drawText(svg, config.numer_prawy, 500, 92, nx, numBaseline, bg);
  }
  const hasCrest = config.herb !== "brak";
  appendText(svg, config.miejscowosc.toLocaleUpperCase("pl-PL"), 500, 150, 842,
    config.numery || hasCrest ? 1300 : 1800, bg, 24, W / 2);
  if (hasCrest) svg.append(crestImage(config, 1838, 728, 92, 124));
  return new XMLSerializer().serializeToString(svg);
}

function buildAddressSvg(config) {
  const svg = svgRoot(config, CANVAS);
  const foreground = config.kolor_tekstu;
  const background = config.kolor_tla;
  svg.append(
    svgNode("rect", {width: CANVAS.width, height: CANVAS.height, fill: background}),
    svgNode("rect", {x: 30, y: 26, width: 1452, height: 1267, fill: "none", stroke: foreground, "stroke-width": 18}),
    svgNode("rect", {x: 21, y: 1208, width: 1470, height: 94, fill: foreground})
  );

  const street = streetName(config);
  if (config.prefiks) {
    appendText(svg, "ULICA", 400, 92, 170, 600, foreground, 3);
    if (config.wielkosc_liter === "wielkie") {
      appendText(svg, street, 500, 180, 405, 1240, foreground);
    } else {
      appendText(svg, street, 700, 133, 358, 1240, foreground);
    }
  } else if (config.wielkosc_liter === "wielkie") {
    appendText(svg, street, 500, 250, 500, 1240, foreground);
  } else {
    appendText(svg, street, 700, 205, 480, 1240, foreground);
  }
  appendText(svg, config.numer, 700, 640, 1060, 1180, foreground);
  appendText(svg, config.miejscowosc.toLocaleUpperCase("pl-PL"), 500, 57, 1280, 1000, background, 10);

  if (config.herb !== "brak") svg.append(crestImage(config, 1386, 1211, 66, 73));
  return new XMLSerializer().serializeToString(svg);
}

function schedulePreview() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(refreshPreview, 160);
}

async function refreshPreview() {
  const ready = form.checkValidity();
  saveButton.disabled = true;
  downloads.hidden = true;
  try {
    const config = configFromForm();
    const label = config.rodzaj === "ulica"
      ? `Tablica z nazwą ulicy ${config.ulica}`
      : `Tabliczka adresowa ${config.ulica} ${config.numer}`;
    showPreview(buildSvg(config), `${label}, ${config.miejscowosc}`, SIZES[config.rozmiar].label);
    if (ready) {
      proofHeading.textContent = "Podgląd do druku";
      proofSubtitle.textContent = "Proporcje i układ odpowiadają gotowej tabliczce.";
      saveButton.disabled = false;
      setStatus("Podgląd jest aktualny.");
    } else {
      proofHeading.textContent = "Podgląd";
      proofSubtitle.textContent = `Puste pola pokazują przykład: ${EXAMPLES[config.rodzaj].opis}.`;
      setStatus(config.rodzaj === "ulica"
        ? "Wpisz nazwę ulicy i numery domów, aby przygotować pliki."
        : "Wpisz ulicę i numer domu, aby przygotować pliki.");
    }
  } catch (error) {
    preview.hidden = true;
    document.querySelector("#placeholder").hidden = false;
    document.querySelector("#placeholder").textContent = error.message;
    proofHeading.textContent = "Podgląd niedostępny";
    proofSubtitle.textContent = "Popraw ustawienia, aby kontynuować.";
    setStatus(error.message, "error");
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

function add300DpiMetadata(pngBytes) {
  const pixelsPerMeter = 11811;
  const physicalData = new Uint8Array(9);
  const view = new DataView(physicalData.buffer);
  view.setUint32(0, pixelsPerMeter);
  view.setUint32(4, pixelsPerMeter);
  physicalData[8] = 1;
  const chunk = pngChunk("pHYs", physicalData);
  const end = pngBytes.length - 12;
  const result = new Uint8Array(pngBytes.length + chunk.length);
  result.set(pngBytes.subarray(0, end));
  result.set(chunk, end);
  result.set(pngBytes.subarray(end), end + chunk.length);
  return result;
}

function renderPng(svg, width, height) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(new Blob([svg], {type: "image/svg+xml;charset=utf-8"}));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Przeglądarka nie udostępniła płótna do zapisu PNG.");
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(async blob => {
          URL.revokeObjectURL(imageUrl);
          if (!blob) {
            reject(new Error("Nie udało się utworzyć pliku PNG."));
            return;
          }
          resolve(new Blob([add300DpiMetadata(new Uint8Array(await blob.arrayBuffer()))], {type: "image/png"}));
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Nie udało się wyrenderować podglądu do PNG."));
    };
    image.src = imageUrl;
  });
}

function downloadLink(link, blob, filename) {
  if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.dataset.url = url;
}

async function prepareDownloads(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!paletteWarning.hidden && !window.confirm(
    "Dla Osiedla Wilga wymagana jest paleta „Zieleń Wilgi”. Czy na pewno przygotować pliki w innej kolorystyce?"
  )) return;

  saveButton.disabled = true;
  downloads.hidden = true;
  setStatus("Przygotowuję SVG i PNG…");
  try {
    const config = configFromForm();
    const svg = buildSvg(config);
    const [widthMm, heightMm] = SIZES[config.rozmiar].mm;
    const widthPx = Math.round(widthMm / 25.4 * 300);
    const heightPx = Math.round(heightMm / 25.4 * 300);
    const png = await renderPng(svg, widthPx, heightPx);
    const filename = [
      escapeFilename(config.miejscowosc),
      escapeFilename(config.ulica),
      config.rodzaj === "ulica" ? "tablica-ulicy" : escapeFilename(config.numer),
      config.rozmiar.replace(".", "-"),
      config.herb === "brak" ? "bez-herbu" : config.herb,
      config.paleta
    ].join("_");
    downloadLink(document.querySelector("#download-svg"), new Blob([svg], {type: "image/svg+xml;charset=utf-8"}), `${filename}.svg`);
    downloadLink(document.querySelector("#download-png"), png, `${filename}.png`);
    downloads.hidden = false;
    setStatus(`Gotowe: PNG ${widthPx} × ${heightPx} px, 300 DPI.`, "success");
  } catch (error) {
    setStatus(error.message || "Nie udało się przygotować plików.", "error");
  } finally {
    saveButton.disabled = false;
  }
}

async function loadSvgAsset(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Nie udało się wczytać pliku ${path} (${response.status}).`);
  const source = await response.text();
  const documentSvg = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = documentSvg.documentElement;
  if (root.localName !== "svg" || documentSvg.querySelector("parsererror")) {
    throw new Error(`Plik ${path} nie zawiera prawidłowego obrazu SVG.`);
  }
  const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some(value => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
    throw new Error(`Plik ${path} nie ma prawidłowego atrybutu viewBox.`);
  }
  for (const unsafe of root.querySelectorAll("script, foreignObject, iframe, object, embed")) unsafe.remove();
  for (const element of root.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      if (["href", "xlink:href"].includes(attribute.name.toLowerCase()) &&
          attribute.value && !attribute.value.startsWith("#") && !attribute.value.startsWith("data:")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  const bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(root));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return {dataUrl: `data:image/svg+xml;base64,${btoa(binary)}`, viewBox};
}

async function initialize() {
  setLocalityOptions();
  updateTypeControls();
  updateLocalityControls();
  updateSwatches();
  try {
    const fontResponse = await fetch(new URL("assets/font-paths.json", document.baseURI));
    if (!fontResponse.ok) throw new Error(`Nie udało się wczytać obrysów czcionki (${fontResponse.status}).`);
    fontData = await fontResponse.json();
    crests = {
      wilga: await loadSvgAsset("assets/herb.svg"),
      garwolin: await loadSvgAsset("assets/herb_garwolin.svg")
    };
    setStatus("Wpisz adres, aby przygotować podgląd.");
    schedulePreview();
  } catch (error) {
    saveButton.disabled = true;
    setStatus(error.message || "Nie udało się wczytać zasobów. Odśwież stronę.", "error");
  }
}

locality.addEventListener("change", () => {
  updateLocalityControls();
  selectSuggestedCrest();
  schedulePreview();
});
customLocality.addEventListener("input", () => {
  selectSuggestedCrest();
  updatePaletteWarning();
  schedulePreview();
});
palette.addEventListener("change", selectPaletteColors);
textColor.addEventListener("input", markCustomPalette);
backgroundColor.addEventListener("input", markCustomPalette);
for (const control of [prefix, crest, size, form.elements.wielkosc_liter, form.elements.strzalka]) {
  control.addEventListener("change", schedulePreview);
}
for (const control of [signType, numbers]) {
  control.addEventListener("change", () => {
    updateTypeControls();
    schedulePreview();
  });
}
for (const name of ["ulica", "numer", "numer_lewy", "numer_prawy"]) {
  form.elements[name].addEventListener("input", schedulePreview);
}
form.addEventListener("submit", prepareDownloads);
initialize();

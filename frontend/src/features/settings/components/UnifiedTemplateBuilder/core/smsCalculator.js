/**
 * Telecom-compliant SMS Character & Segment Calculator
 * Distinguishes GSM-7 7-bit charset from UCS-2 (Unicode) encoding,
 * calculating accurate segment breakdown and remaining character quotas.
 */

// Basic character set (1 septet each)
const GSM_7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà";

// Extended character set (2 septets each: escape prefix + char)
const GSM_7_EXTENDED = "|^€{}[]~\\";

export function analyzeSmsText(text = "") {
  const raw = String(text ?? "");
  const length = raw.length;

  if (length === 0) {
    return {
      encoding: "GSM-7",
      charCount: 0,
      segments: 0,
      maxPerSegment: 160,
      remainingInSegment: 160,
      nonGsmChars: [],
    };
  }

  const nonGsmChars = [];
  let gsmUnits = 0;
  let isGsm = true;

  for (let i = 0; i < length; i++) {
    const char = raw[i];
    if (GSM_7_BASIC.includes(char)) {
      gsmUnits += 1;
    } else if (GSM_7_EXTENDED.includes(char)) {
      gsmUnits += 2;
    } else {
      isGsm = false;
      if (!nonGsmChars.includes(char)) {
        nonGsmChars.push(char);
      }
    }
  }

  if (isGsm) {
    const maxSingle = 160;
    const maxMulti = 153;

    if (gsmUnits <= maxSingle) {
      return {
        encoding: "GSM-7",
        charCount: gsmUnits,
        segments: 1,
        maxPerSegment: maxSingle,
        remainingInSegment: maxSingle - gsmUnits,
        nonGsmChars: [],
      };
    } else {
      const segments = Math.ceil(gsmUnits / maxMulti);
      const remainingInSegment = segments * maxMulti - gsmUnits;
      return {
        encoding: "GSM-7",
        charCount: gsmUnits,
        segments,
        maxPerSegment: maxMulti,
        remainingInSegment,
        nonGsmChars: [],
      };
    }
  }

  // UCS-2 (Unicode encoding)
  const maxSingleUcs = 70;
  const maxMultiUcs = 67;

  if (length <= maxSingleUcs) {
    return {
      encoding: "UCS-2 (Unicode)",
      charCount: length,
      segments: 1,
      maxPerSegment: maxSingleUcs,
      remainingInSegment: maxSingleUcs - length,
      nonGsmChars,
    };
  } else {
    const segments = Math.ceil(length / maxMultiUcs);
    const remainingInSegment = segments * maxMultiUcs - length;
    return {
      encoding: "UCS-2 (Unicode)",
      charCount: length,
      segments,
      maxPerSegment: maxMultiUcs,
      remainingInSegment,
      nonGsmChars,
    };
  }
}

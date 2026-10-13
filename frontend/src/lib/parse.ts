export type Source = { url: string; title?: string }

export type ParsedAnswer = {
  answer: string
  followUps: string[]
  sources: Source[]
}

/**
 * The backend streams:
 *   <ANSWER>...</ANSWER>
 *   <FOLLOW_UPS><question>...</question></FOLLOW_UPS>
 *   <SOURCES>[ ... json ... ]</SOURCES>
 *
 * This runs on every chunk while the text is still arriving, so every
 * closing tag is treated as optional.
 */
export function parseAnswer(raw: string): ParsedAnswer {
  let sources: Source[] = []

  const sourcesMatch = raw.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/)
  if (sourcesMatch?.[1]) {
    try {
      sources = JSON.parse(sourcesMatch[1].trim())
    } catch {
      sources = []
    }
  }

  // the model is asked to use <questions>, but closes with </question>;
  // accept either spelling on both sides
  const followUps = [...raw.matchAll(/<questions?>([\s\S]*?)<\/questions?>/g)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean)

  let answer = ""
  const closed = raw.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/)

  if (closed?.[1]) {
    answer = closed[1]
  } else if (raw.includes("<ANSWER>")) {
    // still streaming: take everything written after the opening tag
    answer = raw.slice(raw.indexOf("<ANSWER>") + "<ANSWER>".length)
  } else {
    // model ignored the format, or the tag hasn't arrived yet
    answer = raw
      .replace(/<SOURCES>[\s\S]*?<\/SOURCES>/, "")
      .replace(/<FOLLOW_UPS>[\s\S]*?(<\/FOLLOW_UPS>|$)/, "")
  }

  return {
    answer: answer.replace(/<FOLLOW_UPS>[\s\S]*$/, "").trim(),
    followUps,
    sources,
  }
}

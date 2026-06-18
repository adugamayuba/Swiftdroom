export interface TailoredResumeData {
  name: string;
  contactLine: string;
  summary: string;
  experience: {
    title: string;
    company: string;
    dates: string;
    location?: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    dates?: string;
    details?: string;
  }[];
  skills: string[];
}

function escapeHtml(text: string) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderResumeHtml(data: TailoredResumeData): string {
  const experienceHtml = data.experience
    .map(
      (job) => `
    <article class="job">
      <div class="job-head">
        <div>
          <h3>${escapeHtml(job.title)}</h3>
          <p class="company">${escapeHtml(job.company)}${job.location ? ` · ${escapeHtml(job.location)}` : ""}</p>
        </div>
        <span class="dates">${escapeHtml(job.dates)}</span>
      </div>
      <ul>${job.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    </article>`
    )
    .join("");

  const educationHtml = data.education
    .map(
      (ed) => `
    <article class="edu">
      <div class="job-head">
        <div>
          <h3>${escapeHtml(ed.degree)}</h3>
          <p class="company">${escapeHtml(ed.school)}</p>
        </div>
        ${ed.dates ? `<span class="dates">${escapeHtml(ed.dates)}</span>` : ""}
      </div>
      ${ed.details ? `<p class="edu-details">${escapeHtml(ed.details)}</p>` : ""}
    </article>`
    )
    .join("");

  const skillsHtml = data.skills.map((s) => `<span class="skill">${escapeHtml(s)}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.name)} — Resume</title>
  <style>
    @page { margin: 0.55in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.45;
      font-size: 10.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in 0.65in;
    }
    header {
      border-bottom: 2.5px solid #0f766e;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    h1 {
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.1;
    }
    .contact {
      margin-top: 8px;
      font-size: 9.5pt;
      color: #475569;
      letter-spacing: 0.01em;
    }
    .summary {
      font-size: 10.5pt;
      color: #334155;
      margin-bottom: 20px;
      line-height: 1.55;
    }
    h2 {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #0f766e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin: 18px 0 10px;
    }
    .job, .edu { margin-bottom: 14px; }
    .job-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 4px;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }
    .company {
      font-size: 10pt;
      color: #64748b;
      margin-top: 1px;
    }
    .dates {
      font-size: 9pt;
      color: #64748b;
      white-space: nowrap;
      flex-shrink: 0;
      padding-top: 2px;
    }
    ul {
      margin: 4px 0 0 18px;
      padding: 0;
    }
    li {
      margin-bottom: 3px;
      color: #334155;
      font-size: 10pt;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .skill {
      background: #f0fdfa;
      color: #0f766e;
      border: 1px solid #99f6e4;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 9pt;
      font-weight: 600;
    }
    .edu-details {
      font-size: 9.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    @media print {
      body { font-size: 10pt; }
      .page { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${escapeHtml(data.name)}</h1>
      <p class="contact">${escapeHtml(data.contactLine)}</p>
    </header>
    ${data.summary ? `<p class="summary">${escapeHtml(data.summary)}</p>` : ""}
    ${data.experience.length ? `<h2>Experience</h2>${experienceHtml}` : ""}
    ${data.education.length ? `<h2>Education</h2>${educationHtml}` : ""}
    ${data.skills.length ? `<h2>Skills</h2><div class="skills">${skillsHtml}</div>` : ""}
  </div>
</body>
</html>`;
}

export function renderPlainText(data: TailoredResumeData): string {
  const lines: string[] = [data.name, data.contactLine, "", data.summary, ""];

  if (data.experience.length) {
    lines.push("EXPERIENCE", "");
    for (const job of data.experience) {
      lines.push(`${job.title} — ${job.company} (${job.dates})`);
      for (const b of job.bullets) lines.push(`  • ${b}`);
      lines.push("");
    }
  }

  if (data.education.length) {
    lines.push("EDUCATION", "");
    for (const ed of data.education) {
      lines.push(`${ed.degree} — ${ed.school}${ed.dates ? ` (${ed.dates})` : ""}`);
    }
    lines.push("");
  }

  if (data.skills.length) {
    lines.push("SKILLS", data.skills.join(" · "));
  }

  return lines.join("\n").trim();
}

export default function ContentPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <a href="/" className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          storyforge
        </a>

        <h1 className="mt-8 font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Content Policy
        </h1>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-foreground/70">
          <p>
            Storyforge engages with morally serious themes. The genres it supports — grimdark, noir,
            cyberpunk, epic sci-fi — all involve violence, betrayal, loss, and moral compromise.
            Characters can fail. NPCs can die. The dice are honest and the consequences can be heavy.
            That&apos;s the point.
          </p>

          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">
              What Storyforge is not for
            </h2>
            <ul className="flex flex-col gap-3">
              <li className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                <span><strong className="text-foreground/90">Sexual content involving minors.</strong> This is a hard line. Claude will refuse regardless.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                <span><strong className="text-foreground/90">Sexual violence rendered for its own sake.</strong> Trauma can be a story element; it is not entertainment.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                <span><strong className="text-foreground/90">Real-world hate content.</strong> The game&apos;s darker factions are fictional. Do not use them as vehicles for racism, antisemitism, or targeted hate against real groups.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                <span><strong className="text-foreground/90">Harassment or impersonation of real people.</strong> Don&apos;t use the game to attack or mock real individuals.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                <span><strong className="text-foreground/90">Instructions for real-world harm.</strong> The game is fiction. Keep it fiction.</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Content guardrails
            </h2>
            <p>
              Claude, the AI that powers Storyforge, will refuse to generate some content categories
              regardless of how the game is framed. If you hit a refusal and it feels wrong, report
              it — but if you&apos;re hitting refusals around the categories above, that&apos;s working as intended.
            </p>
            <p className="mt-4">
              Storyforge is for serious engagement with dark themes, not for finding ways around
              safety systems. If you&apos;re getting refusals or the game feels like it&apos;s pulling back
              from a theme you want to explore, that&apos;s Claude enforcing content guardrails. Some of
              those are hard limits, some are based on framing.
            </p>
          </div>

          <div className="border-l-2 border-primary/30 pl-4">
            <p className="italic text-foreground/50">
              The test is simple: would you publish this chronicle on the site under your real name?
              If not, it probably shouldn&apos;t exist.
            </p>
          </div>

          <div className="pt-4 border-t border-border/10">
            <p className="text-xs text-muted-foreground/50">
              Questions or concerns? <a href="mailto:storyforgegame@gmail.com" className="text-primary/60 hover:text-primary transition-colors">storyforgegame@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

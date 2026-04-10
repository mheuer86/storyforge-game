export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <a href="/" className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          storyforge
        </a>

        <h1 className="mt-8 font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Impressum
        </h1>

        <div className="mt-10 flex flex-col gap-6 text-sm leading-relaxed text-foreground/70">
          <div>
            <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
              Angaben gem&auml;&szlig; &sect; 5 TMG
            </h2>
            <p>
              Martin Heuer<br />
              J&uuml;rgen-T&ouml;pfer-Stra&szlig;e 28<br />
              22763 Hamburg<br />
              Germany
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
              Kontakt
            </h2>
            <p>
              E-Mail: <a href="mailto:storyforgegame@gmail.com" className="text-primary/70 hover:text-primary transition-colors">storyforgegame@gmail.com</a>
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
              Verantwortlich f&uuml;r den Inhalt gem&auml;&szlig; &sect; 55 Abs. 2 RStV
            </h2>
            <p>
              Martin Heuer<br />
              J&uuml;rgen-T&ouml;pfer-Stra&szlig;e 28<br />
              22763 Hamburg
            </p>
          </div>

          <div className="pt-4 border-t border-border/10 text-xs text-muted-foreground/40">
            <p>
              Storyforge is a personal open-source project. It is not operated as a commercial service.
              The game runs on your own Anthropic API key or a limited demo budget. No personal data is collected or stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

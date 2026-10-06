const RESPONSIVE = ['sm', 'md', 'lg', 'xl'];

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    // Customer portal templates can contain Tailwind classes in user-authored HTML.
    // Since this HTML is stored in the DB and rendered at runtime, Tailwind's
    // static content scan won't see the class names unless we safelist patterns.
    { pattern: /^(block|inline-block|inline|hidden|flex|inline-flex|grid|contents)$/, variants: RESPONSIVE },
    { pattern: /^(flex-(row|col))$/, variants: RESPONSIVE },
    { pattern: /^items-(start|end|center|baseline|stretch)$/, variants: RESPONSIVE },
    { pattern: /^justify-(start|end|center|between|around|evenly)$/, variants: RESPONSIVE },
    { pattern: /^gap-[0-9]+$/, variants: RESPONSIVE },
    { pattern: /^p[trblxy]?-[0-9]+$/, variants: RESPONSIVE },
    { pattern: /^m[trblxy]?-[0-9]+$/, variants: RESPONSIVE },
    { pattern: /^w-(full|auto|screen|[0-9]+\/[0-9]+)$/, variants: RESPONSIVE },
    { pattern: /^h-(full|auto|screen)$/, variants: RESPONSIVE },
    { pattern: /^(min|max)-w-(0|full|screen)$/, variants: RESPONSIVE },
    { pattern: /^(min|max)-h-(0|full|screen)$/, variants: RESPONSIVE },
    { pattern: /^shrink-0$/, variants: RESPONSIVE },
    { pattern: /^grow$/, variants: RESPONSIVE },
    { pattern: /^rounded(-[a-z0-9]+)?$/, variants: RESPONSIVE },
    { pattern: /^border(-[a-z0-9]+)?$/, variants: RESPONSIVE },
    { pattern: /^bg-[a-z]+-(50|100|200|300|400|500|600|700|800|900)$/, variants: RESPONSIVE },
    { pattern: /^text-[a-z]+-(50|100|200|300|400|500|600|700|800|900)$/, variants: RESPONSIVE },
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/, variants: RESPONSIVE },
    { pattern: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, variants: RESPONSIVE },
    { pattern: /^leading-(none|tight|snug|normal|relaxed|loose)$/, variants: RESPONSIVE },
    { pattern: /^tracking-(tighter|tight|normal|wide|wider|widest)$/, variants: RESPONSIVE },
    { pattern: /^(uppercase|lowercase|capitalize)$/, variants: RESPONSIVE },
    { pattern: /^shadow(-[a-z0-9]+)?$/, variants: RESPONSIVE },
  ],
};

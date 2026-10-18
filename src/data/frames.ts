import { AnthologyFrame, LutPreset } from '../types/anthology';

export const baseThemesData: Array<{ title: string; sub: string; tag: string; directorNotes: string; soundCue: string; tags: string[] }> = [
  { title: "THE SINGULARITY", sub: "দৃষ্টি", tag: "MACRO EYES: PUPILS DILATING INTO THE VOID", directorNotes: "Extreme close-up macro on iris contraction under tungsten key light. Atmospheric tension.", soundCue: "Sub-bass pulse 36Hz with metallic drone", tags: ["macro", "cosmic", "eyes", "intro"] },
  { title: "EVENT HORIZON", sub: "সীমানা", tag: "FIRST GLIMPSE OF THE MACRO BLOOM", directorNotes: "Boundary definition between observer and subject. Light bending around perimeter.", soundCue: "Gravitational sweep with high-pass whistle", tags: ["macro", "horizon", "bloom"] },
  { title: "PHOTON SPHERE", sub: "আলো", tag: "TISSUE TEXTURES SHIFTING UNDER MICRO LIGHTING", directorNotes: "Micro-fiber epidermal texture under continuous ring light. Grazing light angle.", soundCue: "Resonant glass tone 440Hz", tags: ["light", "micro", "texture"] },
  { title: "SHOCK // CORE", sub: "সংঘাত", tag: "SUDDEN VISUAL: GLOSSY LUBE & SUBTLE YELLOW TINT", directorNotes: "High-contrast dynamic flash. Specular reflections highlighting surface tension.", soundCue: "Impact transient with visceral low-end boom", tags: ["shock", "gloss", "dynamic"] },
  { title: "SPATIAL DISTORTION", sub: "বাঁক", tag: "EYES ROLLING BACK AS GRAVITY HITS", directorNotes: "Dutch angle roll. Subject in ecstatic sensory overload. Anamorphic stretch.", soundCue: "Phase-shifted harmonic drone", tags: ["distortion", "trance", "spatial"] },
  { title: "THE APERTURE", sub: "উন্মোচন", tag: "THE BLOOM STRETCHING LIKE SCATTERED STARLIGHT", directorNotes: "Soft center bloom expanding into shadows. Controlled aperture pull.", soundCue: "Aperture diaphragm mechanical click & shimmer", tags: ["aperture", "bloom", "starlight"] },
  { title: "DARK MATTER", sub: "অন্ধকার", tag: "HEAVY CONTRAST ON THE OUTER RIDGES", directorNotes: "Deep crushed blacks with neon rim accent. High-latitude cinema negative profile.", soundCue: "Low rumble with vinyl crackle texture", tags: ["shadow", "noir", "contrast"] },
  { title: "SHOCK // NEBULA", sub: "মিশ্রণ", tag: "FLASH OF WHITE FLUID MIXING WITH RAW AMBER", directorNotes: "Microcosmic turbulence captured at 120fps high-speed capture.", soundCue: "Hydrodynamic surge with choral undertone", tags: ["shock", "nebula", "amber"] },
  { title: "PARALLAX", sub: "দৃষ্টিভ্রম", tag: "FLICKERING EYELASHES IN HYPNOTIC RHYTHM", directorNotes: "Shallow depth of field rack focus across lash line. Hypnotic tempo.", soundCue: "Binaural rhythmic pulsation 6Hz theta", tags: ["parallax", "hypnotic", "flicker"] },
  { title: "WARP DRIVE", sub: "গতি", tag: "HIGH-SPEED PULL REVEALING THE GAPE", directorNotes: "Kinetic dolly zoom vertigo effect. Edge directional blur accentuation.", soundCue: "Doppler shift acceleration tone", tags: ["speed", "warp", "kinetic"] },
  { title: "ECLIPSE", sub: "গ্রহণ", tag: "DYNAMIC SHADOWS PLAYING ON THE SPHINCTER MUSCLE", directorNotes: "Coronal halo silhouette backlighting. Minimal fill light.", soundCue: "Ethereal wind over abandoned telescope", tags: ["eclipse", "silhouette", "shadow"] },
  { title: "SHOCK // IMPACT", sub: "পতন", tag: "MESSY VISCOUS SPLATTER // RAW REALITY", directorNotes: "Unfiltered visceral realism. 1/8000s shutter freezing fluid kinetic droplets.", soundCue: "Visceral sub-drop with liquid slap", tags: ["shock", "impact", "visceral"] },
  { title: "ACCRETION", sub: "ঘূর্ণন", tag: "EYES LOCKED, TEARING UP FROM THE FORCE", directorNotes: "Slow spiral camera movement centered on subject's corneal reflection.", soundCue: "Centrifugal whirl with sub-octave growl", tags: ["accretion", "vortex", "gaze"] },
  { title: "THE ABYSS", sub: "গভীরতা", tag: "MACRO FOCUS FALLING INTO THE CENTER BLOOM", directorNotes: "Stepless macro zoom diving into darkness. Infinite depth illusion.", soundCue: "Deep oceanic trench resonance", tags: ["abyss", "depth", "macro"] },
  { title: "KINETIC ENERGY", sub: "কম্পন", tag: "MICRO-TREMORS AND PULSATING TEXTURES", directorNotes: "Sub-pixel vibration. Muscle involuntary twitching caught at 240fps.", soundCue: "Fast jitter pulse 120BPM low-pass", tags: ["kinetic", "tremor", "pulse"] },
  { title: "SHOCK // FUSION", sub: "মিলন", tag: "LUBE BUBBLES AND YELLOWISH HUES IN MACRO", directorNotes: "Extreme macro lens probe showing refraction through viscous layer.", soundCue: "Chemical fizz with resonant bell tap", tags: ["shock", "fusion", "macro"] },
  { title: "OBSERVER EFFECT", sub: "সাক্ষী", tag: "DEAD-LOCKED EYE CONTACT WITH THE LENS", directorNotes: "Fourth wall shatter. Subject piercing directly into cinema auditorium.", soundCue: "Stark silence with faint heartbeat", tags: ["observer", "fourthwall", "intensity"] },
  { title: "WORMHOLE", sub: "পথ", tag: "THE BLOOM FORCIBLY HELD OPEN IN TIME", directorNotes: "Long exposure light trail passing through center tunnel.", soundCue: "Time-dilation sweep with metallic ring", tags: ["wormhole", "time", "tunnel"] },
  { title: "SPECTRAL SHIFT", sub: "বর্ণালি", tag: "SLIGHT LIGHT ANGLE CHANGE ALTERS THE TEXTURE", directorNotes: "Prismatic light refraction splitting into RGB chromatic fringes.", soundCue: "Filter sweep 800Hz to 4kHz", tags: ["spectral", "prismatic", "color"] },
  { title: "SHOCK // OVERFLOW", sub: "প্লাবন", tag: "SUDDEN LEAK OF CUM AND NATURAL FLUIDS", directorNotes: "Viscous flow breaking surface tension under rim lighting.", soundCue: "Liquid spill with dynamic pressure drop", tags: ["shock", "overflow", "fluids"] },
  { title: "PULSAR", sub: "স্পন্দন", tag: "EYELIDS FLUTTERING LIKE A DYING STAR", directorNotes: "Stroboscopic key pulse matching eyelid fluttering rhythm.", soundCue: "Synchronized staccato click series", tags: ["pulsar", "strobe", "flutter"] },
  { title: "GRAVITY WELL", sub: "টান", tag: "THE BLOOM SUCKING INWARD, HYPNOTIC LOOP", directorNotes: "Circular vortex pull motion blur framing center subject.", soundCue: "Inward suction sub-bass vacuum", tags: ["gravity", "vortex", "loop"] },
  { title: "SURFACE TENSION", sub: "চাপ", tag: "GLOSSY REFLECTIONS ON TIGHTENED SKIN", directorNotes: "Specular highlights dancing across taut epidermal plane.", soundCue: "Tension wire plucked under water", tags: ["tension", "specular", "gloss"] },
  { title: "SHOCK // ERUPTION", sub: "বিস্ফোরণ", tag: "MESSY, UNFILTERED TEXTURE OF THE AFTERMATH", directorNotes: "Volcanic kinetic release, uncontrolled organic scattering.", soundCue: "Low-end explosive pressure blast", tags: ["shock", "eruption", "texture"] },
  { title: "BLINDING LIGHT", sub: "অন্ধ", tag: "EYES SQUEEZED SHUT IN ABSOLUTE TRANCE", directorNotes: "Overexposed 10,000 lumen key blast casting harsh facial contours.", soundCue: "White noise crescendo into pure tone", tags: ["light", "trance", "overexposed"] },
  { title: "THE CRATER", sub: "গহ্বর", tag: "A PERFECT, ASYMMETRICAL MACRO GAPE", directorNotes: "Topographical study of anatomical asymmetry. Architectural gaze.", soundCue: "Lunar canyon echo", tags: ["crater", "topography", "macro"] },
  { title: "LUMINESCENCE", sub: "দ্যুতি", tag: "RING FLASH ILLUMINATING THE DEEPEST TISSUES", directorNotes: "Circular ring flash signature catchlight inside deep cavity.", soundCue: "Fluorescent ballast hum with sparkle", tags: ["luminescence", "ringflash", "depth"] },
  { title: "SHOCK // LIQUID", sub: "তরল", tag: "THICK WHITE DROPS SLIDING OVER YELLOWISH TONES", directorNotes: "Viscosity contrast: slow gravitational slide against taut skin.", soundCue: "Droplet impacts with spatial reverb", tags: ["shock", "liquid", "viscosity"] },
  { title: "STRETCHED TIME", sub: "প্রসারণ", tag: "MACRO EYES WIDENING BEYOND LIMITS", directorNotes: "Overcranked phantom flex 1000fps capture stretched to infinity.", soundCue: "Time-stretched choral note", tags: ["time", "dilation", "macro"] },
  { title: "THE TEAR", sub: "বিচ্ছিন্নতা", tag: "THE BLOOM PUSHED TO ITS MAXIMUM RADIUS", directorNotes: "Max elastic strain limit under forensic macro examination.", soundCue: "Strained fibrous drone", tags: ["elastic", "limit", "strain"] },
  { title: "MICRO GRAVITY", sub: "ভারহীন", tag: "FLOATING, FLUID MOTIONS OF THE MUSCLE TRACT", directorNotes: "Weightless floating motion aesthetic with zero-gravity camera drift.", soundCue: "Orbital ambient pad", tags: ["gravity", "floating", "fluid"] },
  { title: "SHOCK // VISCOUS", sub: "ঘনত্ব", tag: "EXTREME CLOSE-UP OF THE FLUID MIXTURE", directorNotes: "Molecular level micro lens inspection of fluid emulsion.", soundCue: "Dense bass rumble with bubble pops", tags: ["shock", "viscous", "emulsion"] },
  { title: "ZERO POINT", sub: "শূন্য", tag: "A SINGLE TEAR DROPPING FROM THE OBSERVER", directorNotes: "Slow descending meniscus droplet glistening along tear duct.", soundCue: "Solitary crystal chime decaying into black", tags: ["zero", "tear", "solitude"] },
  { title: "THE VORTEX", sub: "ঘূর্ণি", tag: "THE CENTER OF THE BLOOM IN SHARP FOCUS", directorNotes: "Spiral composite framing drawing all optical lines to one vortex.", soundCue: "Swirling phase phaser soundscape", tags: ["vortex", "focus", "spiral"] },
  { title: "LIGHT TRAP", sub: "আবদ্ধ", tag: "NO LIGHT ESCAPES THE MACRO DEPTH", directorNotes: "Vantablack absorbing all ambient illumination inside center void.", soundCue: "Absolute sonic absorption null", tags: ["void", "black", "depth"] },
  { title: "SHOCK // RAW", sub: "নগ্নতা", tag: "MESSY, UNAPOLOGETIC ANAL SECRETIONS", directorNotes: "Documentary forensic raw style. Zero cosmetic retouching.", soundCue: "Unfiltered visceral tape saturation", tags: ["shock", "raw", "realism"] },
  { title: "PARALLEL", sub: "সমান্তরাল", tag: "SPLIT SCREEN: HER EYE AND THE BLOOM", directorNotes: "Diptych juxtaposition: ocular dilated pupil versus anatomical counterpart.", soundCue: "Stereo dual pulse cross-panning", tags: ["parallel", "diptych", "symmetry"] },
  { title: "THE COLLAPSE", sub: "ধ্বংস", tag: "THE BLOOM SLOWLY CLOSING, EXHAUSTED", directorNotes: "Gradual decay of tension. Relaxing muscular architecture.", soundCue: "Deflating low frequency exhale", tags: ["collapse", "decay", "release"] },
  { title: "INFRARED", sub: "তাপ", tag: "WARM TUNGSTEN LIGHT EXPOSING EVERY VEIN", directorNotes: "Subsurface scattering revealing subcutaneous vascular network.", soundCue: "Warm analog synthesizer filter opening", tags: ["infrared", "heat", "veins"] },
  { title: "SHOCK // DISCHARGE", sub: "নির্গমন", tag: "SUDDEN VISUAL OF CUM DRIPPING DOWN", directorNotes: "Dynamic gravitational release sliding along contour curve.", soundCue: "Sudden low transient drop", tags: ["shock", "discharge", "gravity"] },
  { title: "HYPER-SPEED", sub: "উন্মাদনা", tag: "RAPID FLICKER OF HER EYES LOSING FOCUS", directorNotes: "24fps strobe shutter speed exposing disoriented eye saccades.", soundCue: "Shutter machine gun burst", tags: ["speed", "flicker", "saccade"] },
  { title: "THE TUNNEL", sub: "সুড়ঙ্গ", tag: "HIGH-SPEED PUSH AND PULL BLUR", directorNotes: "Continuous z-axis tracking shot into an endless cylinder.", soundCue: "Subway tunnel wind roar", tags: ["tunnel", "motion", "blur"] },
  { title: "KINETIC FRICTION", sub: "ঘর্ষণ", tag: "DYNAMIC TEXTURE CHANGES FROM MOTION", directorNotes: "Thermal friction sheen appearing on flushed epidermal layer.", soundCue: "Static sandpaper brush texture", tags: ["friction", "thermal", "motion"] },
  { title: "SHOCK // SLIP", sub: "স্খলন", tag: "THE YELLOW-TINTED LUBE SMEARING THE LENS", directorNotes: "Optical glass smeared with oily substance blurring HUD optics.", soundCue: "Muffled smear sweep", tags: ["shock", "smear", "lens"] },
  { title: "AFTERGLOW", sub: "অবশেষ", tag: "GLAZED, HYPNOTIZED MACRO EYES", directorNotes: "Pupil dilation remaining frozen in euphoric exhaustion.", soundCue: "Warm reverb wash with lingering pad", tags: ["afterglow", "hypnotic", "calm"] },
  { title: "THE SCAR", sub: "চিহ্ন", tag: "THE OVERSTRETCHED, BEAUTIFUL RED BLOOM", directorNotes: "Vibrant crimson flush lingering on strained tissue margins.", soundCue: "Resonant cello sustained bow", tags: ["scar", "crimson", "beauty"] },
  { title: "ECHOES", sub: "প্রতিধ্বনি", tag: "MUSCLE SPASMS CAPTURED IN SLOW MOTION", directorNotes: "Involuntary rhythmic aftershocks echoing across the frame.", soundCue: "Rhythmic echo delays in 1/8 triplets", tags: ["echo", "spasm", "aftershock"] },
  { title: "SHOCK // ALLOY", sub: "মিশ্র ধাতু", tag: "THE METALLIC SHINE OF FLUIDS AND SWEAT", directorNotes: "Liquid mercury appearance under cool silver directional bounce.", soundCue: "Metallic scrape with sub undertone", tags: ["shock", "alloy", "mercury"] },
  { title: "GLITCH", sub: "ত্রুটি", tag: "EYES DARTING UNCONTROLLABLY", directorNotes: "Visual digital artifacting simulation mixed with biological tremor.", soundCue: "Digital buffer stutter glitch sound", tags: ["glitch", "artifact", "tremor"] },
  { title: "ASYMMETRY", sub: "অসমতা", tag: "THE BLOOM DISTORTED BY THE HEAVY ANGLE", directorNotes: "Extreme off-axis wide perspective challenging optical distortion.", soundCue: "Detuned harmonic intervals", tags: ["asymmetry", "angle", "perspective"] },
  { title: "RADIANCE", sub: "বিকিরণ", tag: "SHADOWS DANCING ON THE MOIST TISSUE", directorNotes: "Volumetric light rays piercing through humid atmospheric haze.", soundCue: "Celestial choir chord progression", tags: ["radiance", "volumetric", "light"] },
  { title: "SHOCK // EXPOSE", sub: "উন্মুক্ত", tag: "EXTREME MACRO OF THE MESSY, YELLOWISH CORE", directorNotes: "Unsparing cinematic honesty revealing interior micro anatomy.", soundCue: "Low-end visceral thud", tags: ["shock", "expose", "anatomy"] },
  { title: "THE RETURN", sub: "প্রত্যাবর্তন", tag: "EYES SNAPPING BACK TO DEAD CENTER", directorNotes: "Sudden sharp eye contact reclaiming consciousness from void.", soundCue: "Sharp inhale gasping sound", tags: ["return", "focus", "consciousness"] },
  { title: "THE RE-OPENING", sub: "পুনর্জন্ম", tag: "BLOOM FORCED WIDE OPEN ONCE AGAIN", directorNotes: "Second act initiation. Maximum aperture expansion under new light.", soundCue: "Opening hydraulic pressure release", tags: ["reopening", "expansion", "acttwo"] },
  { title: "REFRACTION", sub: "প্রতিসরণ", tag: "LIGHT BENDING THROUGH THE THICK LUBE", directorNotes: "Caustic light patterns refracting across skin like water pools.", soundCue: "Caustic watery sparkle tones", tags: ["refraction", "caustics", "water"] },
  { title: "SHOCK // THE SPILL", sub: "পতন", tag: "HEAVY DROP OF CUM SPILLING OVER THE EDGE", directorNotes: "Slow motion gravitational cascade crossing outer rim boundary.", soundCue: "Heavy drop impact on marble surface", tags: ["shock", "spill", "gravity"] },
  { title: "QUANTUM LOCK", sub: "আবদ্ধ", tag: "EYES WIDE, FROZEN IN PURE ECSTASY", directorNotes: "Statue-like stillness amidst surrounding turbulent lighting.", soundCue: "Pure suspended sinusoidal tone", tags: ["quantum", "frozen", "ecstasy"] },
  { title: "THE NODE", sub: "কেন্দ্র", tag: "THE ABSOLUTE CENTER OF THE SINGULARITY", directorNotes: "Geometric convergence of all anatomical and architectural lines.", soundCue: "Center frequency 100Hz pure anchor", tags: ["node", "center", "singularity"] },
  { title: "SURFACE WAVE", sub: "তরঙ্গ", tag: "RIPPLING TEXTURES ACROSS THE SKIN", directorNotes: "Concentric shockwaves propagating across moist surface plane.", soundCue: "Rippling water resonant swell", tags: ["wave", "ripple", "texture"] },
  { title: "SHOCK // CHAOS", sub: "বিশৃঙ্খলা", tag: "LUBE, SWEAT, AND YELLOW TINTS BLENDED", directorNotes: "Jackson Pollock visceral organic splatter composition.", soundCue: "Poly-rhythmic noise explosion", tags: ["shock", "chaos", "splatter"] },
  { title: "DENSITY", sub: "ঘনত্ব", tag: "THE HEAVINESS IN HER GAZE", directorNotes: "Psychological weight conveyed through micro eye tension.", soundCue: "Deep gravitational bass rumble", tags: ["density", "gaze", "weight"] },
  { title: "COMPRESSION", sub: "চাপ", tag: "THE BLOOM TIGHTENING AROUND THE VOID", directorNotes: "Inward radial contraction choking out light rays.", soundCue: "Compression pump rhythmic squeeze", tags: ["compression", "tightening", "void"] },
  { title: "MAGNETIC FIELD", sub: "আকর্ষণ", tag: "THE PULL OF THE SHINY, WET TEXTURES", directorNotes: "Ferrofluid aesthetic. Glistening highlights adhering to magnetic lines.", soundCue: "Electromagnetic buzz & hiss", tags: ["magnetic", "attraction", "shine"] },
  { title: "SHOCK // THE MIX", sub: "মিশ্রণ", tag: "RAW, UNDILUTED VISUAL OF THE AFTERMATH", directorNotes: "Organic cocktail of physiological secretions under harsh 5600K key.", soundCue: "Fluid mixing squelch and drone", tags: ["shock", "mix", "undiluted"] },
  { title: "BACKGROUND NOISE", sub: "গুঞ্জন", tag: "EYES HALF OPEN, COMPLETELY LOST", directorNotes: "Semi-conscious sensory drift. Soft focus eye gaze wandering.", soundCue: "Cosmic microwave background hiss", tags: ["noise", "drift", "gaze"] },
  { title: "THE FREQUENCY", sub: "কম্পাঙ্ক", tag: "RAPID, VIBRATING MICRO-MOVEMENTS OF THE GAPE", directorNotes: "Resonance matching resonant frequency of surrounding space.", soundCue: "High-speed vibrato tone 60Hz", tags: ["frequency", "vibration", "resonance"] },
  { title: "HEAT SIGNATURE", sub: "উত্তাপ", tag: "RED AND AMBER TONES HIGHLIGHTING THE TISSUE", directorNotes: "False-color thermographic warmth mapping flush intensities.", soundCue: "Warm sizzling embers tape loop", tags: ["heat", "amber", "thermal"] },
  { title: "SHOCK // PURE", sub: "খাঁটি", tag: "THE SHOCKING BEAUTY OF THE ANATOMICAL MESS", directorNotes: "Transcendence of taboo through high art photographic composition.", soundCue: "Grand organ chord with sub undertone", tags: ["shock", "pure", "beauty"] },
  { title: "FRACTAL", sub: "ভগ্নাংশ", tag: "TEARS BLURRING THE MACRO EYE SHOT", directorNotes: "Liquid lens created by pooled tears refracting eyelashes into fractals.", soundCue: "Kaleidoscopic glass bell sequence", tags: ["fractal", "tears", "macro"] },
  { title: "THE GATEWAY", sub: "দ্বার", tag: "THE BLOOM AS A PORTAL TO THE UNKNOWN", directorNotes: "Symbolic cosmic gateway perspective between biology and cosmos.", soundCue: "Low portal humming atmosphere", tags: ["gateway", "portal", "unknown"] },
  { title: "OPTICAL ILLUSION", sub: "ভ্রম", tag: "LIGHT SHIFTS MAKING THE BLOOM LOOK INFINITE", directorNotes: "Moire effect and concentric light circles creating endless depth illusion.", soundCue: "Shepard tone infinite rising pitch", tags: ["illusion", "infinite", "optics"] },
  { title: "SHOCK // VISUAL", sub: "দৃশ্য", tag: "SUDDEN SPLASH OF WHITE ACROSS THE DARKNESS", directorNotes: "High-contrast dynamic flash striking deep shadow background.", soundCue: "Whip crack followed by booming reverb", tags: ["shock", "splash", "contrast"] },
  { title: "EXPANSION", sub: "প্রসার", tag: "EYES WIDENING IN SUDDEN SHOCK", directorNotes: "Involuntary sensory shock expanding iris to maximum perimeter.", soundCue: "Gasping surge of filtered noise", tags: ["expansion", "shock", "pupil"] },
  { title: "THE TEAR II", sub: "বিদারণ", tag: "THE GAPE REACHING ITS ABSOLUTE LIMIT", directorNotes: "Physical boundary pushed to absolute elastic architectural capacity.", soundCue: "Tension breaking creak", tags: ["limit", "strain", "boundary"] },
  { title: "VOID DRIFT", sub: "ভাসমান", tag: "SMOOTH, FRICTIONLESS SLIDE REVEALED BY LIGHT", directorNotes: "Zero friction hydroplane motion glide under grazing beam.", soundCue: "Frictionless glide tone", tags: ["drift", "glide", "smooth"] },
  { title: "SHOCK // SECRETE", sub: "ক্ষরণ", tag: "THE SUBTLE YELLOW MINGLING WITH PURE WHITE", directorNotes: "Dual chromatic fluid interaction captured in macro detail.", soundCue: "Slow viscous droplet release", tags: ["shock", "secretion", "colors"] },
  { title: "FROZEN TIME", sub: "স্থির", tag: "EYES LOCKED IN A FREEZE-FRAME", directorNotes: "Chronophotographic still moment amidst continuous audio pulse.", soundCue: "Complete silence except faint click", tags: ["frozen", "time", "still"] },
  { title: "THE SINGULARITY II", sub: "বিন্দু", tag: "A PERFECT, STILL MACRO SHOT OF THE BLOOM", directorNotes: "Geometric harmony achieved between center void and surrounding tissue.", soundCue: "Deep monochromatic bass drone 40Hz", tags: ["singularity", "stillness", "perfection"] },
  { title: "CRYOGENIC", sub: "শীতল", tag: "CRISP, RAZOR-SHARP FOCUS ON THE TEXTURE", directorNotes: "Ice cold color palette with clinical razor-sharp micro sharpness.", soundCue: "Frost cracking glass crystal tones", tags: ["cryo", "sharp", "clinical"] },
  { title: "SHOCK // CONTRAST", sub: "বৈপরীত্য", tag: "THE DARK ASSHOLE COVERED IN GLOSSY FLUIDS", directorNotes: "Deepest melanin pigments glistening against translucent fluids.", soundCue: "Dynamic contrast slam tone", tags: ["shock", "contrast", "specular"] },
  { title: "SYNERGY", sub: "সমন্বয়", tag: "THE EYE AND THE BLOOM PULSATING IN SYNC", directorNotes: "Harmonic biological resonance between upper and lower anatomy.", soundCue: "Entrained heartbeat duet", tags: ["synergy", "sync", "harmony"] },
  { title: "THE ALIGNMENT", sub: "সরলরেখা", tag: "PERFECT SYMMETRY IN THE MACRO FRAME", directorNotes: "Stanley Kubrick one-point perspective central alignment.", soundCue: "Harmonic chord resolution", tags: ["alignment", "symmetry", "kubrick"] },
  { title: "LUMINOUS FLUX", sub: "প্রবাহ", tag: "LIGHT REFLECTING OFF EVERY WET SURFACE", directorNotes: "Dancing specular highlights turning anatomical landscape into stars.", soundCue: "Glittering bell cascade", tags: ["flux", "stars", "highlights"] },
  { title: "SHOCK // THE CLIMAX", sub: "চূড়া", tag: "THE HEAVIEST MIX OF FLUIDS YET", directorNotes: "Culmination of all organic narrative threads in single tableau.", soundCue: "Massive orchestral sub impact", tags: ["shock", "climax", "finale"] },
  { title: "ACCELERATION", sub: "ত্বরণ", tag: "EYES BLINKING RAPIDLY IN OVERLOAD", directorNotes: "Rapid fire biological shutter reacting to intense sensory input.", soundCue: "Accelerating pulse train", tags: ["acceleration", "overload", "shutter"] },
  { title: "THE LAUNCH", sub: "ক্ষেপণ", tag: "THE BLOOM BOUNCING BACK FROM IMPACT", directorNotes: "Elastic recoil dampening caught on high speed camera.", soundCue: "Booming rubbery elastic release", tags: ["launch", "recoil", "impact"] },
  { title: "KINETIC BLUR", sub: "অস্পষ্টতা", tag: "TEXTURES BLURRING INTO A HYPNOTIC SPIN", directorNotes: "Rotational camera blur spinning center axis at 720 deg/s.", soundCue: "Whirling rotor blade sweep", tags: ["kinetic", "spin", "hypnotic"] },
  { title: "SHOCK // THE DROP", sub: "পতন", tag: "A SINGLE HEAVY DROP OF LUBE AND CUM FALLING", directorNotes: "Isolated gravitational descent frozen against black velvet.", soundCue: "Heavy drop resonant chamber reverb", tags: ["shock", "drop", "gravity"] },
  { title: "THE CLOUD", sub: "মেঘ", tag: "SOFT FOCUS ON HER EXHAUSTED EYES", directorNotes: "Dreamy diffusion filter softening all harsh contours into haze.", soundCue: "Gentle analog synthesizer cloud", tags: ["cloud", "exhaustion", "dream"] },
  { title: "THE NEBULA", sub: "নীহারিকা", tag: "THE BLOOM SURROUNDED BY A MESS OF FLUIDS", directorNotes: "Interstellar cloud morphology mimicked by organic fluids.", soundCue: "Deep space ambient rumble", tags: ["nebula", "organic", "cosmos"] },
  { title: "DIFFRACTION", sub: "বিচ্ছুরণ", tag: "LIGHT SPLITTING ACROSS THE WET TEXTURES", directorNotes: "Prismatic spectral fringes dancing along wet edges.", soundCue: "Glass harmonica chord", tags: ["diffraction", "prism", "light"] },
  { title: "SHOCK // UNFILTERED", sub: "অকৃত্রিম", tag: "THE RAW, YELLOWISH REALITY OF THE DEEP", directorNotes: "Uncompromising truth to medium and biological reality.", soundCue: "Raw tape saturated bassline", tags: ["shock", "unfiltered", "truth"] },
  { title: "IMPLOSION", sub: "অন্তর্মুখী", tag: "EYES ROLLING BACK FOR THE LAST TIME", directorNotes: "Final collapse into trance state. Whites of eyes reflecting key light.", soundCue: "Reverse cymbal crescendo into void", tags: ["implosion", "trance", "collapse"] },
  { title: "THE CRUSH", sub: "পেষণ", tag: "THE BLOOM SLOWLY PULSATING SHUT", directorNotes: "Slow muscular closure sealing off the interior universe.", soundCue: "Slow heavy gate closing resonance", tags: ["crush", "closure", "pulse"] },
  { title: "FADING LIGHT", sub: "ম্লান", tag: "THE LIGHT SOURCE DIMMING OVER THE TEXTURES", directorNotes: "Tungsten dimmer slowly dropping filament temperature to deep amber.", soundCue: "Fading low drone into brown noise", tags: ["fading", "amber", "dim"] },
  { title: "SHOCK // THE SEAL", sub: "অন্তিম", tag: "THE MESSY, BEAUTIFUL FINAL STATE OF THE BLOOM", directorNotes: "Final resting anatomical landscape glistening in the dim embers.", soundCue: "Warm analog low-pass hum", tags: ["shock", "seal", "final"] },
  { title: "OBSERVATION DECK", sub: "পর্যবেক্ষণ", tag: "THE FINAL LOOK IN HER EYES", directorNotes: "Calm, knowing gaze acknowledging the journey complete.", soundCue: "Single clear melodic tone with delay", tags: ["observation", "gaze", "closure"] },
  { title: "THE RECORD", sub: "দলিল", tag: "A WIDE MACRO OF THE ENTIRE CHAOS", directorNotes: "Archival overview documenting the complete battlefield of sensations.", soundCue: "Film projector mechanical spooling", tags: ["record", "archive", "overview"] },
  { title: "BLACKOUT", sub: "অন্ধকার", tag: "THE TEXTURES FADING INTO THE SHADOWS", directorNotes: "Gradual step fade to black. Only specular glints remain visible.", soundCue: "Decaying drone falling below 20Hz", tags: ["blackout", "shadow", "fade"] },
  { title: "THE END OF TIME", sub: "সমাপ্তি", tag: "THE HYPNOTIC LOOP RESTARTS FROM ZERO", directorNotes: "Ouroboros loop seamlessly re-aligning with frame 001 Singularity.", soundCue: "Sub-bass harmonic restart pulse", tags: ["end", "loop", "infinity"] }
];

export const colorPalette = [
  "#ffffff", // pure silver white
  "#d4af37", // cinematic gold
  "#ff4b4b", // vivid crimson
  "#4b9eff", // cyan cobalt
  "#00ffcc", // neon teal
  "#ff8c00", // deep amber
  "#e0e0e0"  // titanium platinum
];

export const lutPresetsList: Array<{ id: LutPreset; label: string; desc: string }> = [
  { id: 'cinematic', label: 'RAWx Cinema 35', desc: 'Warm shadows, golden skin tones, rich 14-bit contrast' },
  { id: 'noir', label: 'Neo-Noir Monochrome', desc: 'Silvery highlights, crushed blacks, moody chiaroscuro' },
  { id: 'golden', label: 'Golden Hour 2800K', desc: 'Amber flares, honey warmth, nostalgic film stock' },
  { id: 'tungsten', label: 'Tungsten 3200K', desc: 'Deep warm incandescent glow with emerald shadows' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Cyan-magenta split toning, neon contrast punch' },
  { id: 'infrared', label: 'Infrared Vascular', desc: 'False-color thermal red and deep burgundy highlights' },
  { id: 'monolith', label: 'Monolith Brutalist', desc: 'High-grain desaturated cold slate and titanium' },
  { id: 'matrix', label: 'Matrix Emerald', desc: 'Classic digital phosphorescent green tint' },
  { id: 'raw', label: 'Flat Film Raw Log', desc: 'Maximum latitude flat profile for neutral grading' }
];

// Curated high quality cinematic sample packs for instant 1-click loading!
export const samplePacks = {
  cosmicMacro: [
    "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80"
  ],
  cyberNoir: [
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80"
  ],
  liquidGold: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80"
  ]
};

const focalOptions = ["18mm Cinema Ultra-Wide", "28mm Anamorphic Prime", "35mm High-Speed Master", "50mm f/1.2 Noctilux", "85mm f/1.4 Portrait", "100mm f/2.8 Macro Probe", "135mm f/2.0 Telephoto"];
const shutterOptions = ["f/1.2 ISO 200", "f/1.4 ISO 400", "f/1.8 ISO 320", "f/2.8 ISO 800", "f/4.0 ISO 1600", "f/2.0 ISO 250"];

export function generateInitialFrames(): AnthologyFrame[] {
  return Array.from({ length: 100 }, (_, i) => {
    const base = baseThemesData[i % baseThemesData.length];
    const epNumber = String(i + 1).padStart(3, '0');
    const colorAccent = colorPalette[i % colorPalette.length];
    const hoverStyle = i % 3;
    const focalLength = focalOptions[i % focalOptions.length];
    const shutter = shutterOptions[i % shutterOptions.length];

    // Seed first 8 frames with sample high-res cinematic images so the app is instantly gorgeous
    const sampleImg = samplePacks.cosmicMacro[i % samplePacks.cosmicMacro.length];
    const defaultImage = i < 12 ? sampleImg : undefined;

    return {
      id: i,
      epNumber,
      title: base.title,
      bengaliTitle: base.sub,
      tagline: base.tag,
      directorNotes: base.directorNotes,
      soundCue: base.soundCue,
      cameraSpec: {
        focalLength,
        aperture: shutter.split(' ')[0],
        shutter: "1/48s 180°",
        iso: shutter.split(' ')[1] + " " + (shutter.split(' ')[2] || "400"),
        sensor: "Full-Frame 36x24 Cine Sensor",
        format: "RAW 14-BIT ARRI"
      },
      imageUrl: defaultImage,
      colorAccent,
      hoverStyle,
      lutFilter: 'cinematic',
      aspectRatio: '2.39:1',
      adjustments: {
        brightness: 100,
        contrast: 115,
        saturation: 110,
        bloom: 55,
        grain: 15,
        motionBlur: 70,
        vignette: 40
      },
      tags: base.tags
    };
  });
}

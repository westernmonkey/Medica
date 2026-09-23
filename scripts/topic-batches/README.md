# Manual topic encoding

Continue reviewing every unencoded question under public/bank. The user approved all questions, in batches, and explicitly rejected Qwen and external model APIs. Preserve the 14 pre-existing labels. Do not run encode-question-topics.mjs; it calls Ollama.

Read the actual question, options and solution before assigning a topic. Inspect essential diagrams; never infer unseen reaction details from the answer alone. Unreadable or ambiguous questions remain pending, with their paths and reasons recorded here. Folder names supply the chapter prefix only, not the topic.

Save each set of explicit decisions as the next batch-NNN.json using full repo-relative question paths and values of the form "Chapter - Specific Topic". Run node scripts/apply-topic-batch.mjs scripts/topic-batches/batch-NNN.json. The writer validates paths and conflicts, reopens saved files, and verifies all other fields are unchanged. It is resumable: identical existing labels are skipped. A write failure stops processing; completed entries remain saved.

Count actual encodedTopic fields for progress; batch counts alone exclude pre-existing labels. Do not claim the whole bank is complete until every question is accounted for. No process classifies questions while this assistant is idle.

## Source issues observed in batch 004

- Chemical Bonding and Molecular Structure/64c0e7be6f5bfc7ab78ae77b.json: the single-answer question contains multiple false statements (oxygen anion bond length and nitrogen anion magnetism as well as the keyed bond-order statement).
- Chemical Bonding and Molecular Structure/64c0e7d06f5bfc7ab78ae81a.json: isolated ammonium does not contain an ionic bond; the source answer conflates an ion with an ammonium salt.
- Chemical Bonding and Molecular Structure/64c0e7db6f5bfc7ab78ae870.json: the source calls a resonance-averaged oxygen charge a formal charge. Individual Lewis-structure formal charges are integers.

These source fields were preserved. Their subject matter is sufficient to assign topics without endorsing the answers.

## Source issues observed in batches 005 and 006

All paths below are relative to public/bank/bitsat/Chemistry/Practice. Source content was preserved.

- Chemical Bonding and Molecular Structure/65b7b87c97ae24e9e2db8cd8.json: question defines lattice dissociation enthalpy, but all options and solution refer to crystal defects. Topic follows the question.
- Chemical Equilibrium/64c0e7b06f5bfc7ab78ae702.json: source inequality contradicts its small dissociation constant; iodine atom notation also appears corrupted.
- Chemical Equilibrium/67726d0ac49e8ef28ee2b3c9.json: constant pure-solid activities do not make Le Chatelier's principle generally inapplicable to solid equilibria.
- Chemical Kinetics/64c0e7946f5bfc7ab78ae613.json: the two pairwise comparisons yield the keyed orders, but rate magnitudes across all four runs are inconsistent with one rate constant.
- Chemical Kinetics/64c0e7c06f5bfc7ab78ae78c.json: two options are equivalent (twice R's half-life equals S's half-life), although only one is keyed correct.

## Scheduled progress

2026-09-22 23:12 UTC run: applied batch 018 (25 personally reviewed topics across Ionic Equilibrium and Polymers). Actual count: 432 encoded / 44,668 question files; 44,236 remain. The writer reopened saved JSON and verified all non-topic fields unchanged. Solution-only diagrams were not needed to identify these topics from the question, options, and written solutions. Source issues preserved: Ionic Equilibrium/64c0e8096f5bfc7ab78aea03.json gives an incorrect pH calculation for mixing pH 3 and pH 2 solutions, Ionic Equilibrium/64c0e8316f5bfc7ab78aeb65.json assumes an unstated NaOH concentration at equivalence, and Polymers/64c0e7fc6f5bfc7ab78ae991.json names tetrafluoroethane instead of tetrafluoroethylene as Teflon's monomer. Paths here are relative to public/bank/bitsat/Chemistry/Practice. Topics identify the assessed subject without endorsing those answers.

2026-09-20 00:28 UTC run: applied batch 017 (18 newly written personally reviewed topics; one duplicate existing label skipped). Actual count: 407 encoded / 44,668 total; 44,261 remain. Writer reopened each saved JSON and verified all non-topic fields unchanged. Diagram-dependent questions with unreadable products remain pending; no labels were guessed from missing diagrams. This batch covered resolvable Hydrocarbons, Hydrogen and Ionic Equilibrium questions.

2026-09-19 23:21 UTC run: applied batch 016 (19 newly written personally reviewed topics; three entries were already labeled and were safely skipped). Actual count: 389 encoded / 44,668 total; 44,279 remain. Writer reopened each saved JSON and verified all non-topic data unchanged. Three diagram-dependent questions remain pending because their products/options are not present in readable text: Hydrocarbons/64c0e7936f5bfc7ab78ae60f, Hydrocarbons/64c0e7a16f5bfc7ab78ae68c, and Hydrocarbons/64c0e8176f5bfc7ab78aea80. Labels covered resolvable haloalkane, hydrocarbon and hydrogen questions.

2026-09-19 21:17 UTC run: applied batch 015 (21 personally reviewed questions). Actual count: 370 encoded / 44,668 total; 44,298 remain. Writer reopened each saved JSON and verified every non-topic field unchanged. Three image-dependent Hydrocarbons questions were left pending because their structure/product diagrams were not safely inferable from the extracted text: 64c0e7936f5bfc7ab78ae60f, 64c0e7936f5bfc7ab78ae61d, and 64c0e8256f5bfc7ab78aeaff. The applied labels cover five metallurgy questions, twelve haloalkane/haloarene questions, and four text-resolvable hydrocarbon questions.

2026-09-19 20:16 UTC run: applied batch 014 (25 personally reviewed questions). Actual count: 349 encoded / 44,668 total; 44,319 remain. Writer reopened each JSON and verified other data unchanged. Inspected 18 diagrams for the seven image-dependent organic questions; no unresolved classifications in this batch. Source issues preserved: General Organic Chemistry/64c0e8246f5bfc7ab78aeaf6.json compares structures with different molecular formulae as though directly comparable stability were defined; General Organic Chemistry/67726cfcc49e8ef28ee2b35d.json depicts a different saturated ring in its solution and incorrectly calls its nitrogen sp2; General Principles and Processes of Isolation of Metals/64c0e7f86f5bfc7ab78ae96f.json makes a misleading solvent-versus-electrolyte distinction for molten cryolite. All paths here are relative to public/bank/bitsat/Chemistry/Practice. Topic labels describe the assessed concepts without endorsing source errors.

2026-09-19 19:15 UTC run: applied batch 013 (25 personally reviewed General Organic Chemistry questions). Actual count: 324 encoded / 44,668 total; 44,344 remain. Writer reopened every saved JSON and verified other fields unchanged. Inspected 16 essential diagrams covering Fischer projections, carbanions, chiral centres, IUPAC names, nitrogen stereochemistry, aromaticity and HBr addition products. No unresolved classifications in this batch. Source issues preserved: 64c0e7b16f5bfc7ab78ae709.json calls all four stereoisomers “enantiomers” rather than two enantiomeric pairs; 64c0e7fa6f5bfc7ab78ae983.json calls the stabilising hydrogen bond intermolecular rather than intramolecular and contradicts itself about the most stable conformation; 64c0e7f86f5bfc7ab78ae970.json conflates aliphatic primary amines with formation of arene diazonium salts. The SI-prefix question 64c0e7ce6f5bfc7ab78ae806.json retains its supplied chapter prefix despite being misfiled. IDs are within public/bank/bitsat/Chemistry/Practice/General Organic Chemistry.

2026-09-19 18:14 UTC run: applied batch 012 (25 personally reviewed questions). Actual bank count: 299 encoded / 44,668 total; 44,369 remain. Reopened saved JSON and verified all non-topic data unchanged. Inspected the question and solution images for General Organic Chemistry/64c0e7856f5bfc7ab78ae590.json and all three structure options plus the solution image for General Organic Chemistry/64c0e7776f5bfc7ab78ae511.json. No unresolved diagrams in this batch. Original source content preserved, including Environmental Chemistry/64c0e7cb6f5bfc7ab78ae7f3.json's unqualified claim that NO is the main automobile exhaust pollutant; the label identifies exhaust pollutants without endorsing that claim.

2026-09-19 17:02 UTC run: applied batch 011 (25 personally reviewed Electrochemistry questions). Actual bank count: 274 encoded / 44,668 total; 44,394 remain. Writer reopened each file and verified non-topic data unchanged. Source issues preserved: Electrochemistry/64c0e7bf6f5bfc7ab78ae788.json incorrectly denotes the concentration-dependent potential as standard E0 (standard potential does not vary with concentration); Electrochemistry/64c0e7df6f5bfc7ab78ae894.json labels the 0.16 V copper couple as Cu(II)/Cu instead of Cu(II)/Cu(I). Both topics remain identifiable from the question text.

2026-09-19 16:01 UTC run: batches 007 and 008 from interrupted runs are present; applied batches 009 and 010 (40 additional personally reviewed questions). Actual bank count verified: 249 encoded / 44,668 total; 44,419 remain. Each new write verified that all other data remained unchanged. No pending diagram-dependent topics in these two batches. Continue with remaining Electrochemistry questions.

Source issues in these batches (paths relative to public/bank/bitsat/Chemistry/Practice):
- Coordination Compounds/64c0e7956f5bfc7ab78ae61c.json: source claims chloride is the most basic ligand among chloride, cyanide, hydroxide and water; this rationale is incorrect. Topic identifies ligand effects on stability without endorsing the key.
- Coordination Compounds/64c0e7b26f5bfc7ab78ae715.json: keyed pair uses Fe(III) but solution uses Fe(II); high-spin Cr(II) and Fe(III) do not have equal unpaired-electron counts.
- Coordination Compounds/64c0e7ed6f5bfc7ab78ae90f.json: solution initially uses Fe(II) instead of Fe(III) for potassium ferricyanide.
- Coordination Compounds/64c0e8306f5bfc7ab78aeb5e.json: environmental chemistry matching question is filed under Coordination Compounds. Folder prefix preserved; specific topic follows the actual question.
- Electrochemistry/64c0e7786f5bfc7ab78ae51a.json: solution treats equivalent concentration as molar solubility for divalent barium sulfate, omitting the factor of two.

2026-09-19: applied batches 005 and 006 (50 questions). Each saved JSON was reopened and all non-topic data compared with its pre-edit object. Actual bank count: 159 encoded / 44,668 total. Continue at the next unencoded question; existing labels remain unchanged. No unresolved diagram-dependent classification was introduced in these batches: question text and solutions identify the topics even where answer diagrams are present.

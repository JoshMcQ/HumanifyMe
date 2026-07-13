# AI writing signs

This is the public review checklist behind `humanifyme analyze` and the evaluation scorer. The canonical implementation is [`src/quality/aiSigns.ts`](../src/quality/aiSigns.ts); a synchronization test fails if this document drops an item.

The command detects only mechanically defensible signals and shows the matching evidence. Signs such as "no lived experience" or "no actual stakes" require a person to judge them. HumanifyMe does not convert this checklist into an AI probability or claim that any one sign proves machine authorship.

1. The "X is not just Y, it is Z" ending
2. "At its core, X is about Y"
3. Every paragraph ends like a LinkedIn post
4. "In today's fast-paced world"
5. "Landscape" language
6. Overused AI vocabulary
7. Overuse of transition words
8. "It is important to note"
9. "Plays a critical role"
10. Balanced-to-death writing
11. Generic "pros and cons" structure
12. Too many bullets
13. Symmetrical writing
14. Repeating the same point in different words
15. Vague examples
16. No lived experience
17. No real opinion
18. No weirdness
19. Sanitized emotion
20. Fake empathy
21. "As an AI language model" energy, even without the phrase
22. Fake nuance
23. "Best practices" without tradeoffs
24. "Actionable insights"
25. Corporate verb stacking
26. Fake specificity
27. Three-part alliteration
28. "From X to Y" phrasing
29. "Whether you are X or Y"
30. "By doing X, you can Y"
31. "Not only X but also Y"
32. "The real power/value lies in"
33. "A testament to"
34. "Paves the way"
35. "Game-changer"
36. "Rich tapestry"
37. Over-politeness
38. No contractions
39. Perfect grammar but unnatural rhythm
40. Too many abstract nouns
41. Passive voice everywhere
42. Avoiding blame or agency
43. Generic moral conclusions
44. "Meaningful" overuse
45. "Human-centered" slapped onto everything
46. "Ensure that"
47. The answer sounds like it was written for nobody
48. Overexplaining obvious context
49. Refusing to answer directly
50. Overuse of headers like "Understanding X"
51. Fake "comprehensive guide" voice
52. "Deep dive" / "delve into"
53. Too much hedging
54. Too much certainty in generic claims
55. Missing negative space
56. "Users" instead of real people
57. No sensory detail
58. No time, place, or sequence
59. It sounds like a school essay
60. It sounds like a corporate memo
61. Too much "stakeholder" language
62. "Personalized" without personal details
63. Generic motivational tone
64. "Journey" overuse
65. Apology + validation + answer formula
66. The "safe answer sandwich"
67. The five-paragraph answer to a one-sentence question
68. Overuse of "clear, concise, and"
69. Repeating the user's wording too neatly
70. "Here is a polished version"
71. Markdown artifacts left in normal text
72. Weird em dash addiction
73. Semicolon-heavy fake sophistication
74. Colon setup sentences
75. Too many quote-like sentences
76. No mistakes where mistakes would be natural
77. Tries to sound like the "average" person
78. Uses "we" without a real we
79. Names categories but not realities
80. "Scalable" with no scale
81. "Secure" with no threat model
82. "User-friendly" with no interaction detail
83. Too clean for the context
84. Awkwardly formal synonyms
85. Lack of contradictions
86. No actual stakes
87. "Impact" used as a magic word
88. "Value" used as a magic word
89. Placeholder detail
90. Recycled conclusion phrases

## Run it

Analyze a file:

```bash
npx -y humanifyme analyze draft.txt
```

Or pipe text through standard input:

```bash
echo "your draft" | npx -y humanifyme analyze
```

The command sends nothing over the network and does not require a HumanifyMe profile.

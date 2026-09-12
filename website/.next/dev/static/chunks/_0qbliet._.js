(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/hero.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Hero",
    ()=>Hero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
/** Never seek earlier than this after the intro — butterflies are gone. */ const CUTOFF = 12;
/** Crossfade length. Incoming fades up on top; outgoing stays opaque. */ const LOOP_FADE = 0.9;
const FRAME = 1 / 24;
const HERO_SRC = "/hero-meadow.mp4?v=6";
const VIDEO_FILL = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center"
};
function setLayer(el, { opacity, z }) {
    el.style.opacity = String(opacity);
    el.style.zIndex = String(z);
}
function Hero() {
    _s();
    const aRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const bRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Hero.useEffect": ()=>{
            const a = aRef.current;
            const b = bRef.current;
            if (!a || !b) return;
            let front = a;
            let back = b;
            let fading = false;
            let alive = true;
            let rafId = 0;
            const play = {
                "Hero.useEffect.play": (el)=>{
                    void el.play().catch({
                        "Hero.useEffect.play": ()=>{
                            void el.play().catch({
                                "Hero.useEffect.play": ()=>{}
                            }["Hero.useEffect.play"]);
                        }
                    }["Hero.useEffect.play"]);
                }
            }["Hero.useEffect.play"];
            const prepareBack = {
                "Hero.useEffect.prepareBack": ()=>{
                    back.pause();
                    setLayer(back, {
                        opacity: 0,
                        z: 0
                    });
                    const seek = {
                        "Hero.useEffect.prepareBack.seek": ()=>{
                            if (Math.abs(back.currentTime - CUTOFF) > FRAME) {
                                back.currentTime = CUTOFF;
                            }
                        }
                    }["Hero.useEffect.prepareBack.seek"];
                    if (back.readyState >= 1) seek();
                    else back.addEventListener("loadedmetadata", seek, {
                        once: true
                    });
                }
            }["Hero.useEffect.prepareBack"];
            const startIncoming = {
                "Hero.useEffect.startIncoming": ()=>{
                    if (Math.abs(back.currentTime - CUTOFF) > 0.2) {
                        back.currentTime = CUTOFF;
                    }
                    setLayer(back, {
                        opacity: 0,
                        z: 1
                    });
                    play(back);
                }
            }["Hero.useEffect.startIncoming"];
            let swapping = false;
            const finishSwap = {
                "Hero.useEffect.finishSwap": ()=>{
                    if (swapping) return;
                    swapping = true;
                    front.pause();
                    setLayer(front, {
                        opacity: 0,
                        z: 0
                    });
                    setLayer(back, {
                        opacity: 1,
                        z: 0
                    });
                    const outgoing = front;
                    front = back;
                    back = outgoing;
                    fading = false;
                    play(front);
                    prepareBack();
                    swapping = false;
                }
            }["Hero.useEffect.finishSwap"];
            setLayer(a, {
                opacity: 1,
                z: 0
            });
            setLayer(b, {
                opacity: 0,
                z: 0
            });
            prepareBack();
            play(a);
            const step = {
                "Hero.useEffect.step": ()=>{
                    const dur = front.duration;
                    if (!dur || !Number.isFinite(dur)) return;
                    // Finish the blend before `ended`, so the playing copy never stalls.
                    const fadeStart = dur - LOOP_FADE - 0.2;
                    const t = front.currentTime;
                    const atEnd = front.ended || t >= dur - 0.05;
                    if (!fading && t >= fadeStart && t >= CUTOFF) {
                        fading = true;
                        startIncoming();
                    }
                    if (fading) {
                        const p = atEnd ? 1 : Math.min(1, Math.max(0, (t - fadeStart) / LOOP_FADE));
                        setLayer(front, {
                            opacity: 1,
                            z: 0
                        });
                        setLayer(back, {
                            opacity: p,
                            z: 1
                        });
                        if (p >= 1) finishSwap();
                    } else if (atEnd && t >= CUTOFF) {
                        fading = true;
                        startIncoming();
                        finishSwap();
                    }
                }
            }["Hero.useEffect.step"];
            const loop = {
                "Hero.useEffect.loop": ()=>{
                    if (!alive) return;
                    step();
                    rafId = requestAnimationFrame(loop);
                }
            }["Hero.useEffect.loop"];
            rafId = requestAnimationFrame(loop);
            const onEnded = {
                "Hero.useEffect.onEnded": (event)=>{
                    if (event.target !== front) return;
                    if (!fading) {
                        fading = true;
                        startIncoming();
                    }
                    finishSwap();
                }
            }["Hero.useEffect.onEnded"];
            a.addEventListener("ended", onEnded);
            b.addEventListener("ended", onEnded);
            return ({
                "Hero.useEffect": ()=>{
                    alive = false;
                    cancelAnimationFrame(rafId);
                    a.removeEventListener("ended", onEnded);
                    b.removeEventListener("ended", onEnded);
                }
            })["Hero.useEffect"];
        }
    }["Hero.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        style: {
            position: "relative",
            width: "100%",
            height: "100vh",
            background: "#0a0a0a",
            overflow: "clip"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: aRef,
                autoPlay: true,
                muted: true,
                playsInline: true,
                preload: "auto",
                poster: "/hero-meadow.png?v=4",
                style: VIDEO_FILL,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                    src: HERO_SRC,
                    type: "video/mp4"
                }, void 0, false, {
                    fileName: "[project]/components/hero.tsx",
                    lineNumber: 165,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/hero.tsx",
                lineNumber: 156,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: bRef,
                muted: true,
                playsInline: true,
                preload: "auto",
                style: {
                    ...VIDEO_FILL,
                    opacity: 0
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                    src: `${HERO_SRC}&p=b`,
                    type: "video/mp4"
                }, void 0, false, {
                    fileName: "[project]/components/hero.tsx",
                    lineNumber: 174,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/hero.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "calc(8.9% + 12px)",
                    width: "100%",
                    margin: 0,
                    zIndex: 2,
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 50,
                    fontWeight: 500,
                    lineHeight: "60px",
                    color: "#ffffff"
                },
                children: "You're getting dumber."
            }, void 0, false, {
                fileName: "[project]/components/hero.tsx",
                lineNumber: 177,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "calc(54% + 12px)",
                    width: "100%",
                    margin: 0,
                    zIndex: 2,
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 48,
                    fontWeight: 500,
                    lineHeight: "58px",
                    color: "#ffffff"
                },
                children: [
                    "Monarch gives AI guardrails,",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                        fileName: "[project]/components/hero.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, this),
                    "so you can keep learning."
                ]
            }, void 0, true, {
                fileName: "[project]/components/hero.tsx",
                lineNumber: 197,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/hero.tsx",
        lineNumber: 147,
        columnNumber: 5
    }, this);
}
_s(Hero, "8qb+5BLKZWeTkubQ3hQ1EsJDZQE=");
_c = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/pinned-wordmark.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PinnedWordmark",
    ()=>PinnedWordmark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$wordmark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/wordmark.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/use-page-scale.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
/** Same design-space origin as the hero lockup. */ const LEFT = 63;
const TOP = 28;
const MARK_HEIGHT = 34;
const CTA_HEIGHT = 40;
/** Vertically center the 40px button on the 34px wordmark. */ const CTA_TOP = TOP + (MARK_HEIGHT - CTA_HEIGHT) / 2;
function PinnedWordmark() {
    _s();
    const scale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWidthScale"])();
    const [onHero, setOnHero] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PinnedWordmark.useEffect": ()=>{
            const update = {
                "PinnedWordmark.useEffect.update": ()=>{
                    const hero = document.getElementById("site-hero");
                    if (!hero) {
                        setOnHero(window.scrollY < __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DESIGN_VIEWPORT_HEIGHT"] * scale);
                        return;
                    }
                    const bottom = hero.getBoundingClientRect().bottom;
                    setOnHero(bottom > (TOP + MARK_HEIGHT) * scale);
                }
            }["PinnedWordmark.useEffect.update"];
            update();
            window.addEventListener("scroll", update, {
                passive: true
            });
            window.addEventListener("resize", update);
            return ({
                "PinnedWordmark.useEffect": ()=>{
                    window.removeEventListener("scroll", update);
                    window.removeEventListener("resize", update);
                }
            })["PinnedWordmark.useEffect"];
        }
    }["PinnedWordmark.useEffect"], [
        scale
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: "fixed",
                    left: LEFT * scale,
                    top: TOP * scale,
                    zIndex: 50,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    color: onHero ? "#FFFFFF" : "#0a0a0a",
                    transition: "color 180ms ease",
                    pointerEvents: "none"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$wordmark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Wordmark"], {
                    tone: "inherit"
                }, void 0, false, {
                    fileName: "[project]/components/pinned-wordmark.tsx",
                    lineNumber: 54,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/pinned-wordmark.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                style: {
                    position: "fixed",
                    right: LEFT * scale,
                    top: CTA_TOP * scale,
                    zIndex: 50,
                    transform: `scale(${scale})`,
                    transformOrigin: "top right",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: CTA_HEIGHT,
                    padding: "0 20px",
                    border: 0,
                    borderRadius: 8,
                    background: "#141414",
                    color: "#FFFFFF",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: "18px",
                    cursor: "pointer",
                    transition: "background-color 160ms ease"
                },
                onMouseEnter: (event)=>{
                    event.currentTarget.style.background = "#000000";
                },
                onMouseLeave: (event)=>{
                    event.currentTarget.style.background = "#141414";
                },
                children: "Start Now"
            }, void 0, false, {
                fileName: "[project]/components/pinned-wordmark.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/pinned-wordmark.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_s(PinnedWordmark, "/ZF3QbWi7XFxJp/UwNn3cgLeQ20=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWidthScale"]
    ];
});
_c = PinnedWordmark;
var _c;
__turbopack_context__.k.register(_c, "PinnedWordmark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/scaled.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Scaled",
    ()=>Scaled
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/use-page-scale.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function Scaled({ height, fillWidth = false, children }) {
    _s();
    const pageScale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePageScale"])();
    const widthScale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWidthScale"])();
    const scale = fillWidth ? widthScale : pageScale;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: "100%",
            height: height * scale,
            display: "flex",
            justifyContent: fillWidth ? "flex-start" : "center",
            overflow: "hidden"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DESIGN_WIDTH"],
                height,
                flexShrink: 0,
                transform: `scale(${scale})`,
                transformOrigin: fillWidth ? "top left" : "top center"
            },
            children: children
        }, void 0, false, {
            fileName: "[project]/components/scaled.tsx",
            lineNumber: 34,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/scaled.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_s(Scaled, "E5P/CMLCSaDfezdzKAma9y41Z+o=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePageScale"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWidthScale"]
    ];
});
_c = Scaled;
var _c;
__turbopack_context__.k.register(_c, "Scaled");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/use-page-scale.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DESIGN_VIEWPORT_HEIGHT",
    ()=>DESIGN_VIEWPORT_HEIGHT,
    "DESIGN_WIDTH",
    ()=>DESIGN_WIDTH,
    "usePageScale",
    ()=>usePageScale,
    "useWidthScale",
    ()=>useWidthScale
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const DESIGN_WIDTH = 1440;
const DESIGN_VIEWPORT_HEIGHT = 900;
function usePageScale() {
    _s();
    const [scale, setScale] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "usePageScale.useEffect": ()=>{
            const update = {
                "usePageScale.useEffect.update": ()=>setScale(Math.min(1, window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_VIEWPORT_HEIGHT))
            }["usePageScale.useEffect.update"];
            update();
            window.addEventListener("resize", update);
            return ({
                "usePageScale.useEffect": ()=>window.removeEventListener("resize", update)
            })["usePageScale.useEffect"];
        }
    }["usePageScale.useEffect"], []);
    return scale;
}
_s(usePageScale, "KDB8pVNB/ljEOP4LSE5RBlu9Ou0=");
function useWidthScale() {
    _s1();
    const [scale, setScale] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useWidthScale.useEffect": ()=>{
            const update = {
                "useWidthScale.useEffect.update": ()=>setScale(window.innerWidth / DESIGN_WIDTH)
            }["useWidthScale.useEffect.update"];
            update();
            window.addEventListener("resize", update);
            return ({
                "useWidthScale.useEffect": ()=>window.removeEventListener("resize", update)
            })["useWidthScale.useEffect"];
        }
    }["useWidthScale.useEffect"], []);
    return scale;
}
_s1(useWidthScale, "KDB8pVNB/ljEOP4LSE5RBlu9Ou0=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/wordmark.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Monarch logo + wordmark lockup, 152×34. `light` is for use over imagery. */ __turbopack_context__.s([
    "Wordmark",
    ()=>Wordmark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Wordmark({ tone = "dark", className }) {
    const color = tone === "inherit" ? "inherit" : tone === "light" ? "#FFFFFF" : "#0a0a0a";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        style: {
            display: "flex",
            alignItems: "center",
            gap: 11,
            color
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "30",
                height: "30",
                viewBox: "0 0 100 100",
                style: {
                    flexShrink: 0,
                    position: "relative",
                    top: -4
                },
                "aria-hidden": true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    fillRule: "evenodd",
                    clipRule: "evenodd",
                    d: "M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z",
                    fill: "currentColor"
                }, void 0, false, {
                    fileName: "[project]/components/wordmark.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/wordmark.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    fontFamily: "var(--font-display)",
                    fontSize: 29,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    lineHeight: "34px",
                    color: "inherit",
                    whiteSpace: "nowrap"
                },
                children: "Monarch"
            }, void 0, false, {
                fileName: "[project]/components/wordmark.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/wordmark.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = Wordmark;
var _c;
__turbopack_context__.k.register(_c, "Wordmark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
]);

//# sourceMappingURL=_0qbliet._.js.map
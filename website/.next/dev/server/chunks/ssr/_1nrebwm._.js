module.exports = [
"[project]/components/hero.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Hero",
    ()=>Hero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
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
    const aRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const bRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const a = aRef.current;
        const b = bRef.current;
        if (!a || !b) return;
        let front = a;
        let back = b;
        let fading = false;
        let alive = true;
        let rafId = 0;
        const play = (el)=>{
            void el.play().catch(()=>{
                void el.play().catch(()=>{});
            });
        };
        const prepareBack = ()=>{
            back.pause();
            setLayer(back, {
                opacity: 0,
                z: 0
            });
            const seek = ()=>{
                if (Math.abs(back.currentTime - CUTOFF) > FRAME) {
                    back.currentTime = CUTOFF;
                }
            };
            if (back.readyState >= 1) seek();
            else back.addEventListener("loadedmetadata", seek, {
                once: true
            });
        };
        const startIncoming = ()=>{
            if (Math.abs(back.currentTime - CUTOFF) > 0.2) {
                back.currentTime = CUTOFF;
            }
            setLayer(back, {
                opacity: 0,
                z: 1
            });
            play(back);
        };
        let swapping = false;
        const finishSwap = ()=>{
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
        };
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
        const step = ()=>{
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
        };
        const loop = ()=>{
            if (!alive) return;
            step();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        const onEnded = (event)=>{
            if (event.target !== front) return;
            if (!fading) {
                fading = true;
                startIncoming();
            }
            finishSwap();
        };
        a.addEventListener("ended", onEnded);
        b.addEventListener("ended", onEnded);
        return ()=>{
            alive = false;
            cancelAnimationFrame(rafId);
            a.removeEventListener("ended", onEnded);
            b.removeEventListener("ended", onEnded);
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        style: {
            position: "relative",
            width: "100%",
            height: "100vh",
            background: "#0a0a0a",
            overflow: "clip"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: aRef,
                autoPlay: true,
                muted: true,
                playsInline: true,
                preload: "auto",
                poster: "/hero-meadow.png?v=4",
                style: VIDEO_FILL,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: bRef,
                muted: true,
                playsInline: true,
                preload: "auto",
                style: {
                    ...VIDEO_FILL,
                    opacity: 0
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
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
}),
"[project]/components/pinned-wordmark.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PinnedWordmark",
    ()=>PinnedWordmark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$wordmark$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/wordmark.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/use-page-scale.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
/** Same design-space origin as the hero lockup. */ const LEFT = 63;
const TOP = 28;
const MARK_HEIGHT = 34;
const CTA_HEIGHT = 40;
/** Vertically center the 40px button on the 34px wordmark. */ const CTA_TOP = TOP + (MARK_HEIGHT - CTA_HEIGHT) / 2;
function PinnedWordmark() {
    const scale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWidthScale"])();
    const [onHero, setOnHero] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const update = ()=>{
            const hero = document.getElementById("site-hero");
            if (!hero) {
                setOnHero(window.scrollY < __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DESIGN_VIEWPORT_HEIGHT"] * scale);
                return;
            }
            const bottom = hero.getBoundingClientRect().bottom;
            setOnHero(bottom > (TOP + MARK_HEIGHT) * scale);
        };
        update();
        window.addEventListener("scroll", update, {
            passive: true
        });
        window.addEventListener("resize", update);
        return ()=>{
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [
        scale
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$wordmark$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Wordmark"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
}),
"[project]/components/scaled.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Scaled",
    ()=>Scaled
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/use-page-scale.ts [app-ssr] (ecmascript)");
"use client";
;
;
function Scaled({ height, fillWidth = false, children }) {
    const pageScale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePageScale"])();
    const widthScale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWidthScale"])();
    const scale = fillWidth ? widthScale : pageScale;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: "100%",
            height: height * scale,
            display: "flex",
            justifyContent: fillWidth ? "flex-start" : "center",
            overflow: "hidden"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$use$2d$page$2d$scale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DESIGN_WIDTH"],
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
}),
"[project]/components/use-page-scale.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
const DESIGN_WIDTH = 1440;
const DESIGN_VIEWPORT_HEIGHT = 900;
function usePageScale() {
    const [scale, setScale] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const update = ()=>setScale(Math.min(1, window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_VIEWPORT_HEIGHT));
        update();
        window.addEventListener("resize", update);
        return ()=>window.removeEventListener("resize", update);
    }, []);
    return scale;
}
function useWidthScale() {
    const [scale, setScale] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const update = ()=>setScale(window.innerWidth / DESIGN_WIDTH);
        update();
        window.addEventListener("resize", update);
        return ()=>window.removeEventListener("resize", update);
    }, []);
    return scale;
}
}),
"[project]/components/wordmark.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Monarch logo + wordmark lockup, 152×34. `light` is for use over imagery. */ __turbopack_context__.s([
    "Wordmark",
    ()=>Wordmark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function Wordmark({ tone = "dark", className }) {
    const color = tone === "inherit" ? "inherit" : tone === "light" ? "#FFFFFF" : "#0a0a0a";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        style: {
            display: "flex",
            alignItems: "center",
            gap: 11,
            color
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "30",
                height: "30",
                viewBox: "0 0 100 100",
                style: {
                    flexShrink: 0,
                    position: "relative",
                    top: -4
                },
                "aria-hidden": true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_1nrebwm._.js.map
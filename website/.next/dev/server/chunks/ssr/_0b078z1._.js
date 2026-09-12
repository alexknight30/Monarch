module.exports = [
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
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_0b078z1._.js.map
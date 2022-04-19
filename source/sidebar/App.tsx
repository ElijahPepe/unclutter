import React from "react";
import {
    getFeatureFlag,
    showSocialAnnotationsDefaultFeatureFlag,
} from "source/common/featureFlags";
import {
    createDraftAnnotation,
    hypothesisToLindyFormat,
} from "../common/annotations/getAnnotations";
import { getHypothesisUsername } from "../common/annotations/storage";
import {
    createAnnotation as createAnnotationApi,
    deleteAnnotation as deleteAnnotationApi,
    getAnnotations,
} from "./common/api";
import AnnotationsList from "./components/AnnotationsList";
// import PopularityMessage from "./components/PopularityMessage";

export default function App({ url }) {
    // fetch state from extension settings
    const [isLoggedIn, setIsLoggedIn] = React.useState(null);
    React.useEffect(async () => {
        const user = await getHypothesisUsername();
        setIsLoggedIn(!!user);
    }, []);

    // state of whether to render social annotations. updated through events from overlay code
    const [showSocialAnnotations, setShowSocialAnnotations] =
        React.useState(true);
    React.useEffect(async () => {
        const defaultSocialAnnotationsEnabled = await getFeatureFlag(
            showSocialAnnotationsDefaultFeatureFlag
        );
        setShowSocialAnnotations(defaultSocialAnnotationsEnabled);
    }, []);

    // keep the annotations state here
    const [annotations, setAnnotations] = React.useState([]);
    // fetch annotations on load
    React.useEffect(async () => {
        const annotations = await getAnnotations(url);
        const pageNotes = annotations.filter((a) => !a.quote_html_selector);
        if (pageNotes.length === 0) {
            pageNotes.push(createDraftAnnotation(url));
        }

        // show page notes immediately, others once anchored
        setAnnotations(pageNotes);
        window.top.postMessage(
            { event: "anchorAnnotations", annotations },
            "*"
        );
    }, []);

    // sync local annotation updates to hypothesis
    async function createAnnotation(localAnnotation) {
        const hypothesisAnnotation = await createAnnotationApi(
            url,
            localAnnotation
        );
        const annotation = hypothesisToLindyFormat(
            hypothesisAnnotation,
            localAnnotation.displayOffset
        );
        setAnnotations([
            ...annotations,
            {
                ...annotation,
                displayOffset: localAnnotation.displayOffset,
                localId: localAnnotation.localId,
                isMyAnnotation: true,
            },
        ]);
    }
    function deleteAnnotation(annotation) {
        setAnnotations(annotations.filter((a) => a.id != annotation.id));
        window.top.postMessage({ event: "removeHighlight", annotation }, "*");

        deleteAnnotationApi(annotation.id);
    }
    function onAnnotationHoverUpdate(annotation, hoverActive: boolean) {
        window.top.postMessage(
            { event: "onAnnotationHoverUpdate", annotation, hoverActive },
            "*"
        );
    }

    // receive events from the text highlighting content script code
    window.onmessage = async function ({ data }) {
        if (data.event === "createHighlight") {
            createAnnotation(data.annotation);
        } else if (data.event === "anchoredAnnotations") {
            setAnnotations([...annotations, ...data.annotations]);
        } else if (data.event === "changedDisplayOffset") {
            let updatedAnnotations = annotations.map((a) => ({
                ...a,
                displayOffset:
                    data.offsetById[a.localId] || data.offsetById[a.id],
            }));

            setAnnotations(updatedAnnotations);
        } else if (data.event === "setShowSocialAnnotations") {
            setShowSocialAnnotations(data.showSocialAnnotations);
        }
    };

    return (
        // x margin to show slight shadow (iframe allows no overflow)
        <div className="mx-2">
            <div className="absolute w-full pr-4 flex flex-col gap-2">
                {/* {isLoggedIn && (
                    <PageNotesList
                        url={url}
                        annotations={annotations.filter(
                            (a) => !a.quote_html_selector
                        )}
                        createAnnotation={createAnnotation}
                        deleteAnnotation={deleteAnnotation}
                    />
                )} */}
            </div>
            <AnnotationsList
                url={url}
                annotations={annotations}
                showSocialAnnotations={showSocialAnnotations}
                deleteAnnotation={deleteAnnotation}
                offsetTop={50}
                onAnnotationHoverUpdate={onAnnotationHoverUpdate}
                // upvotedAnnotations={upvotedAnnotations}
                // upvoteAnnotation={upvoteAnnotation}
            />
        </div>
    );
}

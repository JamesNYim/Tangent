import React, { useState } from 'react';
import { createPost } from '../api/posts';

export function createPost( {onPostCreated }) {
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");

        const trimmed = content.trim();
        if (!trimmed) {
            setErr("Post cannot be empty");
            return;
        }

        try {
            setSubmitting(true);
            const newPost = await createPost(trimmed);
            setContent("");

            if (onPostCreated) {
                onPostCreated(newPost);
            }
        }
        catch (e) {
            setErr(e.message || "Failed to create post");
        }
        finally {
            setSubmitting(false);
        }

        
    }


}

export default createPost;

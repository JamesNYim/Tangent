import { useEffect, useState } from "react";
import { getPosts } from "../api/posts";
import Post from "./Post"

function Feed() {
    const [posts, setPosts] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [err, setErr] = useState("");
    
    // Fetching Functions
    async function loadFirstPage() {
        setErr("");
        setLoading(true);
        try {
            const data = await getPosts();
            setPosts(data.feed);
            setNextCursor(data.next_cursor);
        }
        catch (e) {
            setErr(`Failed to get initial feed: ${e?.message ?? String(e)}`);
        }
        finally {
            setLoading(false);
        }
    }

    async function loadMore() {
        if (!nextCursor) {
            console.log("Loading more with no nextCursor");
            return;
        }
        setErr("");
        setLoading(true);
        try {
            const data = await getPosts(nextCursor);
            setPosts((prev) => [...prev, ...data.feed]);
            setNextCursor(data.next_cursor);
        }
        catch (e) {
            setErr("Failed to fetch more posts");
        }
        finally {
            setLoading(false);
        }
    }


    // First React render
    useEffect(() => {
        loadFirstPage();
    }, []);

    // Determining content
    if (loading) {
        return <p> loading... </p>;
    }

    if (err) {
        return <p> {err} </p>;
    }

    let postContent;
    if (posts.length === 0) {
        postContent = "<p>No posts yet.</p>";
    }
    else {
        postContent = posts.map((p) => (
            <Post key={p.id} post={p} />
        ));
    }
    return (
        <div>
            <h2>Feed</h2>
            {postContent}
            <button onClick={loadMore} disabled={!nextCursor}>
                {nextCursor ? "Load more" : "No more posts"}
            </button>
        </div>
    );
}

export default Feed;

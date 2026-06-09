function Post ({ post }) {
    if (!post) {
        console.log("Input post is null");
        return null;
    }
    
    const created_at = post.created_at ? new Date(post.created_at).toLocaleString() : "";
    const username = post.username ? post.username : "Unknown User";
    const content = post.content ? post.content : "...";

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 600 }}>
              {username}
            </div>

            {created_at && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {created_at}
              </div>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            {content}
          </div>
        </div>
    );
}

export default Post;

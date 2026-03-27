import { useParams, useNavigate } from "react-router-dom";
import RepoFileBrowser from "@/components/github/RepoFileBrowser";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

const EditorPage = () => {
  const { owner, repo, branch } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to use the editor");
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!owner || !repo) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid repository path</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <RepoFileBrowser 
        owner={owner}
        repo={repo}
        defaultBranch={branch || "main"}
        onClose={() => navigate(-1)}
        fullMode={true}
      />
    </div>
  );
};

export default EditorPage;

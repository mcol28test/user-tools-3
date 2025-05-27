import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import Tabs from "@atlaskit/tabs";
import Button from "@atlaskit/button";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset success message after 2 seconds
    } catch (err) {
      console.error("Failed to copy content:", err);
      setError("Failed to copy content to clipboard");
    }
  };

  const handleCopyEmails = async () => {
    const emailList = Object.values(userData).map(user => user.email).join("\n");
    await handleCopy(emailList);
  };

  const handleCopyNames = async () => {
    const namesList = Object.values(userData).map(user => user.displayName).join("\n");
    await handleCopy(namesList);
  };

  const findMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
  };

  const lookupUserEmail = async (displayName) => {
    try {
      // Use the Jira REST API to search for users
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        // Return user data of the first matching user
        if (users && users.length > 0) {
          return {
            email: users[0].emailAddress,
            displayName: users[0].displayName
          };
        }
        return null;
      }
    } catch (err) {
      console.error(`Failed to lookup user ${displayName}:`, err);
      return null;
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const context = await view.getContext();
        const text = context.extension.selectedText;
        setSelectedText(text);

        // Find and process @mentions
        const mentions = findMentions(text);
        const userDataResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUserEmail(mention);
            if (user) {
              userDataResults[mention] = user;
            }
          })
        );

        setUserData(userDataResults);
      } catch (err) {
        setError(err.message);
        console.error("Failed to get context:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContext();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: "16px" }}>Error: {error}</div>;
  }

  if (isLoading) {
    return <div style={{ padding: "16px" }}>Loading...</div>;
  }

  const tabs = [
    {
      label: "Email",
      content: (
        <div>
          {Object.values(userData).length > 0 ? (
            <div>
              <ul>
                {Object.values(userData).map((user, index) => (
                  <li key={index}>{user.email}</li>
                ))}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <Button appearance="primary" onClick={handleCopyEmails}>
                  Copy All
                </Button>
                {copySuccess && activeTab === 0 && (
                  <span style={{ color: "#00875A", marginLeft: "8px", fontSize: "14px" }}>
                    ✓ Copied to clipboard!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p>No email addresses found.</p>
          )}
        </div>
      ),
    },
    {
      label: "Full Name",
      content: (
        <div>
          {Object.values(userData).length > 0 ? (
            <div>
              <ul>
                {Object.values(userData).map((user, index) => (
                  <li key={index}>{user.displayName}</li>
                ))}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <Button appearance="primary" onClick={handleCopyNames}>
                  Copy All
                </Button>
                {copySuccess && activeTab === 1 && (
                  <span style={{ color: "#00875A", marginLeft: "8px", fontSize: "14px" }}>
                    ✓ Copied to clipboard!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p>No names found.</p>
          )}
        </div>
      ),
    },
    {
      label: "Avatar",
      content: <div></div>, // Empty content for now as per requirements
    },
  ];

  return (
    <div style={{ padding: "16px" }}>
      <h2>Selected Text:</h2>
      <p>{selectedText}</p>

      {Object.keys(userData).length > 0 && (
        <div>
          <Tabs
            tabs={tabs}
            selected={activeTab}
            onChange={(index) => {
              setActiveTab(index);
              setCopySuccess(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default App;

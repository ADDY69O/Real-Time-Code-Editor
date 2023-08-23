import React, { useEffect, useRef, useState } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";
import axios from "axios";

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const [input, setInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [result, setresult] = useState("");

  const editorRef = useRef(null);
  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
    editorRef.current.setOption("mode", event.target.value);
  };

  const handleInputChange = (newInput) => {
    setInput(newInput);
  };

  const handleSubmit = async (e) => {
    const stringWithoutNewlines = code;
    const body = {
      code: stringWithoutNewlines,
      lang: selectedLanguage,
      input: input,
    };

    const { data } = await axios.post("http://localhost:5000/compile", body);
    if (data.output) {
      const trimmedOutput = data.output.trim(); // Get the trimmed output
      data.output = trimmedOutput; // Update the output property
    }
    setresult(data);
  };

  useEffect(() => {
    async function init() {
      editorRef.current = Codemirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        setCode(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }
    init();
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
          console.log(code);
        }
      });
    }

    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef.current]);

  return (
    <div className="editor-container">
      <div className="editor">
        <textarea
          id="realtimeEditor"
          // Update code state on change
        ></textarea>
      </div>
      <div className="bottom">
        <div className="input-section">
          <p>Input</p>
          <textarea
            className="input-box"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
          />
        </div>
        <div className="output-section">
          <p>Output</p>
          <div className="output-box">
            {result.output
              ? result.output
                  .split("\r\n")
                  .map((line, index) => <div key={index}>{line}</div>) // Convert to string if it's an object
              : result.error
              ? result.error
              : ""}
          </div>
        </div>

        <div className="language-select">
          <select value={selectedLanguage} onChange={handleLanguageChange}>
            <option value="">Select any langauge</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            {/* Add more options as needed */}
          </select>
        </div>
        <button className="btn runBtn" onClick={handleSubmit}>
          Run Code
        </button>
      </div>
    </div>
  );
};

export default Editor;

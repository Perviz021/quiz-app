// Create an ExamContext.js
import { createContext, useContext, useState } from "react";

const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
  const [isExamActive, setIsExamActive] = useState(false);

  return (
    <ExamContext.Provider value={{ isExamActive, setIsExamActive }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => useContext(ExamContext);

import { useState } from "react";
import API_BASE from "../config/api";

const AddQuestion = () => {
  const [formData, setFormData] = useState({
    question: "",
    option1: null,
    option2: null,
    option3: null,
    option4: null,
    option5: null,
    correctOption: 1,
    subjectCode: "",
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      payload.append(key, formData[key]);
    });

    try {
      const res = await fetch(`${API_BASE}/add-question`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: payload,
      });

      const data = await res.json();
      alert(data.message || "Question added!");
    } catch (err) {
      alert("Error adding question.");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Yeni sual əlavə et</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="question"
          onChange={handleChange}
          placeholder="Sual (metn və ya şəkil adı)"
          required
          className="w-full p-2 border rounded"
        />

        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <label>Variant {i} (metn və ya şəkil):</label>
            <input
              type="file"
              name={`option${i}`}
              accept="image/*"
              onChange={handleChange}
            />
            <input
              type="text"
              name={`option${i}`}
              onChange={handleChange}
              placeholder={`Variant ${i} mətn (boş buraxıla bilər)`}
              className="w-full p-2 border rounded mt-1"
            />
          </div>
        ))}

        <input
          type="number"
          name="correctOption"
          min="1"
          max="5"
          required
          onChange={handleChange}
          placeholder="Doğru variant (1-5)"
          className="w-full p-2 border rounded"
        />

        <input
          type="text"
          name="subjectCode"
          required
          onChange={handleChange}
          placeholder="Fənn kodu"
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Əlavə et
        </button>
      </form>
    </div>
  );
};

export default AddQuestion;

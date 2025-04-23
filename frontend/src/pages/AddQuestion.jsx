import { useState } from "react";
import API_BASE from "../config/api";

const AddQuestion = () => {
  const [formData, setFormData] = useState({
    questionText: "",
    questionImage: null,
    option1Text: "",
    option1Image: null,
    option2Text: "",
    option2Image: null,
    option3Text: "",
    option3Image: null,
    option4Text: "",
    option4Image: null,
    option5Text: "",
    option5Image: null,
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

    for (const key in formData) {
      if (formData[key] !== null) {
        payload.append(key, formData[key]);
      }
    }

    try {
      const res = await fetch(`${API_BASE}/add-question`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: payload,
      });

      const data = await res.json();
      alert(data.message || "Sual əlavə olundu!");
    } catch (err) {
      alert("Xəta baş verdi!");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Yeni sual əlavə et</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label>Sualın mətni:</label>
        <input
          type="text"
          name="questionText"
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Sualın mətni (istəyə bağlı)"
        />

        <label>Sualın şəkli:</label>
        <input
          type="file"
          name="questionImage"
          accept="image/*"
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border p-2 rounded">
            <label>Variant {i} mətni:</label>
            <input
              type="text"
              name={`option${i}Text`}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
              placeholder={`Variant ${i} mətni (istəyə bağlı)`}
            />

            <label>Variant {i} şəkli:</label>
            <input
              type="file"
              name={`option${i}Image`}
              accept="image/*"
              onChange={handleChange}
              className="w-full p-2 border rounded"
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

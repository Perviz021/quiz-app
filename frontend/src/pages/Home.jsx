import { Link } from "react-router-dom";

const subjects = ["Math", "Science", "History", "English"];

const Home = () => {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Choose a Subject</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {subjects.map((subject) => (
          <Link
            key={subject}
            to={`/exam/${subject.toLowerCase()}`}
            className="p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-700"
          >
            {subject}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;

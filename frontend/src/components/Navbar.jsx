import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <h1 className="text-xl font-bold">Quiz App</h1>
        <div>
          <Link to="/" className="mr-4">
            Home
          </Link>
          <Link to="/results">Results</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

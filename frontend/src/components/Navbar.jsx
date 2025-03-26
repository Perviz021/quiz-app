import ProtectedLink from "./ProtectedLink";

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <h1 className="text-xl font-bold">Quiz App</h1>
        <div>
          <ProtectedLink to="/" className="mr-4">
            Home
          </ProtectedLink>
          <ProtectedLink to="/results">Results</ProtectedLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

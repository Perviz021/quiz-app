import sys
import subprocess
import mysql.connector
import re

def convert_docx_to_latex(file_path):
    result = subprocess.run(
        ["pandoc", file_path, "-t", "latex"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        print("Error during pandoc conversion:", result.stderr)
        sys.exit(1)
    return result.stdout

def parse_latex_content(latex_text):
    questions = []
    question = ""
    options = []

    # Split by line and remove empty lines
    lines = [line.strip() for line in latex_text.splitlines() if line.strip()]

    for line in lines:
        # Detect options A) B) etc.
        if re.match(r"^(A|B|C|D|E)[\).]", line, re.IGNORECASE):
            options.append(line)
            if len(options) == 5:
                questions.append((question, [opt[2:].strip() for opt in options]))
                question = ""
                options = []
        elif not options:
            # First line is the question
            question = line

    return questions

def insert_into_db(questions, subject_code):
    conn = mysql.connector.connect(
        host="localhost", user="root", password="113355", database="quiz_app"
    )
    cursor = conn.cursor()

    for q, opts in questions:
        cursor.execute(
            """
            INSERT INTO questions (question, option1, option2, option3, option4, option5, correct_option, `fənnin_kodu`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (q, *opts, 1, subject_code),  # Always option A as correct (1)
        )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    file_path = sys.argv[1]
    subject_code = sys.argv[2]

    latex_output = convert_docx_to_latex(file_path)
    question_data = parse_latex_content(latex_output)
    insert_into_db(question_data, subject_code)

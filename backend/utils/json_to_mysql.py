import json
import mysql.connector
from mysql.connector import Error
import time

def import_json_to_mysql(json_file, table_name, db_config):
    """
    Import data from a large JSON file directly into MySQL.
    
    Args:
        json_file (str): Path to the JSON file
        table_name (str): Name of the MySQL table to import into
        db_config (dict): MySQL connection configuration
    """
    try:
        # Connect to MySQL with proper character encoding
        connection = mysql.connector.connect(
            **db_config,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Read JSON file with UTF-8 encoding
            print(f"Reading JSON file: {json_file}")
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Get column names from the first record
            if not data:
                print("No data found in JSON file")
                return
                
            columns = list(data[0].keys())
            placeholders = ', '.join(['%s'] * len(columns))
            columns_str = ', '.join(columns)
            
            # Prepare the INSERT statement
            insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
            
            # Convert data to list of tuples for batch insert
            values = [[record[col] for col in columns] for record in data]
            
            print(f"Starting import of {len(data)} records...")
            start_time = time.time()
            
            # Execute batch insert
            cursor.executemany(insert_query, values)
            connection.commit()
            
            end_time = time.time()
            print(f"Successfully imported {len(data)} records in {end_time - start_time:.2f} seconds")
            
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("MySQL connection closed")

if __name__ == "__main__":
    # MySQL connection configuration
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '113355',
        'database': 'quiz_app'
    }
    
    # Configuration
    json_file = "path/to/your/large_file.json"  # Replace with your JSON file path
    table_name = "ftp"              # Replace with your table name
    
    import_json_to_mysql(json_file, table_name, db_config)
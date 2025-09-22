import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firestore
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

topics = [

    # -------------------- DECIMALS CLUSTER --------------------
    {
        "id": "place_val_dec",
        "name": "Place Value of Decimals",
        "description": "Understanding the place value positions in decimals.",
        "prerequisites": [],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "read_write_dec",
        "name": "Reading & Writing Decimals",
        "description": "Learn to read and write decimals correctly.",
        "prerequisites": ["place_val_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "round_dec",
        "name": "Rounding Decimals",
        "description": "Round decimals to the nearest whole or decimal place.",
        "prerequisites": ["place_val_dec", "read_write_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "compare_order_dec",
        "name": "Comparing & Ordering Decimals",
        "description": "Compare and arrange decimals in ascending or descending order.",
        "prerequisites": ["place_val_dec", "read_write_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "visual_addsub_dec",
        "name": "Visualizing Addition/Subtraction of Decimals",
        "description": "Use visual aids to understand decimal addition and subtraction.",
        "prerequisites": ["place_val_dec", "read_write_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "add_sub_dec",
        "name": "Adding & Subtracting Decimals",
        "description": "Perform addition and subtraction of decimals.",
        "prerequisites": ["visual_addsub_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "estimate_sumdiff_dec",
        "name": "Estimating Sum/Difference of Decimals",
        "description": "Estimate results of decimal addition and subtraction.",
        "prerequisites": ["round_dec", "add_sub_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "prob_solve_addsub_dec",
        "name": "Problem Solving: Addition & Subtraction of Decimals",
        "description": "Solve real-life problems involving addition and subtraction of decimals, including money.",
        "prerequisites": ["add_sub_dec", "estimate_sumdiff_dec"],
        "cluster": "Decimals Cluster"
    },
    {
        "id": "create_prob_addsub_dec",
        "name": "Creating Problems: Addition & Subtraction of Decimals",
        "description": "Formulate real-life problems involving addition and subtraction of decimals, including money.",
        "prerequisites": ["prob_solve_addsub_dec"],
        "cluster": "Decimals Cluster"
    },

    # -------------------- MULTIPLICATION OF DECIMALS --------------------
    {
        "id": "visual_mult_dec",
        "name": "Visualizing Multiplication of Decimals",
        "description": "Use visual aids to understand decimal multiplication.",
        "prerequisites": ["place_val_dec", "read_write_dec"],
        "cluster": "Multiplication of Decimals"
    },
    {
        "id": "mult_dec_whole_num",
        "name": "Multiplying Decimals by Whole Numbers",
        "description": "Multiply decimals with whole numbers.",
        "prerequisites": ["visual_mult_dec"],
        "cluster": "Multiplication of Decimals"
    },
    {
        "id": "mult_dec",
        "name": "Multiplying Decimals (2dp × 2dp)",
        "description": "Multiply decimals up to 2 decimal places by another decimal up to 2 decimal places.",
        "prerequisites": ["mult_dec_whole_num"],
        "cluster": "Multiplication of Decimals"
    },
    {
        "id": "estimate_prod_dec",
        "name": "Estimating Products of Decimals",
        "description": "Estimate the results of decimal multiplication.",
        "prerequisites": ["round_dec", "mult_dec"],
        "cluster": "Multiplication of Decimals"
    },
    {
        "id": "prob_solve_mult_dec",
        "name": "Problem Solving: Multiplication of Decimals",
        "description": "Solve real-life problems involving multiplication of decimals and whole numbers, including money.",
        "prerequisites": ["mult_dec", "estimate_prod_dec"],
        "cluster": "Multiplication of Decimals"
    },

    # -------------------- DIVISION OF DECIMALS --------------------
    {
        "id": "visual_div_dec",
        "name": "Visualizing Division of Decimals",
        "description": "Use visual aids to understand decimal division.",
        "prerequisites": ["place_val_dec", "read_write_dec"],
        "cluster": "Division of Decimals"
    },
    {
        "id": "div_dec",
        "name": "Dividing Decimals (up to 2dp)",
        "description": "Perform division of decimals up to 2 decimal places.",
        "prerequisites": ["visual_div_dec"],
        "cluster": "Division of Decimals"
    },
    {
        "id": "div_whole_num_dec_quot",
        "name": "Dividing Whole Numbers with Decimal Quotients",
        "description": "Perform division of whole numbers that result in decimal quotients.",
        "prerequisites": ["div_dec"],
        "cluster": "Division of Decimals"
    },
    {
        "id": "estimate_quot_dec",
        "name": "Estimating Quotients of Decimals",
        "description": "Estimate the results of decimal division.",
        "prerequisites": ["round_dec", "div_dec"],
        "cluster": "Division of Decimals"
    },
    {
        "id": "prob_solve_div_dec",
        "name": "Problem Solving: Division of Decimals",
        "description": "Solve real-life problems involving division of decimals and whole numbers, including money.",
        "prerequisites": ["div_whole_num_dec_quot", "estimate_quot_dec"],
        "cluster": "Division of Decimals"
    },
    {
        "id": "create_prob_multdiv_dec",
        "name": "Creating Problems: Multiplication & Division of Decimals",
        "description": "Formulate real-life problems involving multiplication and division of decimals and whole numbers, including money.",
        "prerequisites": ["prob_solve_mult_dec", "prob_solve_div_dec"],
        "cluster": "Division of Decimals"
    },

    # -------------------- RATIOS & PROPORTION --------------------
    {
        "id": "visual_ratio",
        "name": "Visualizing Ratios",
        "description": "Understand ratios using visual aids.",
        "prerequisites": [],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "express_ratio",
        "name": "Expressing Ratios",
        "description": "Express ratios using colon or fraction form.",
        "prerequisites": ["visual_ratio"],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "equiv_ratio",
        "name": "Equivalent Ratios",
        "description": "Identify and generate equivalent ratios.",
        "prerequisites": ["express_ratio"],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "simplify_ratio",
        "name": "Simplifying Ratios",
        "description": "Simplify ratios to their lowest terms.",
        "prerequisites": ["equiv_ratio"],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "find_missing_term_ratio",
        "name": "Finding Missing Term in Equivalent Ratios",
        "description": "Find the missing term in equivalent ratios.",
        "prerequisites": ["equiv_ratio", "simplify_ratio"],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "def_desc_prop",
        "name": "Defining & Describing Proportion",
        "description": "Understand the meaning and description of proportion.",
        "prerequisites": ["find_missing_term_ratio"],
        "cluster": "Ratios & Proportion"
    },
    {
        "id": "recog_dir_prop",
        "name": "Recognizing Direct Proportion",
        "description": "Recognize and solve problems involving direct proportion.",
        "prerequisites": ["def_desc_prop"],
        "cluster": "Ratios & Proportion"
    }

]

# Insert into Firestore
for topic in topics:
    db.collection("topics").document(topic["id"]).set(topic)

print("Topics seeded successfully!")

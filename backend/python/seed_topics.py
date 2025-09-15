# seed_topics.py
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

topics = [
    # --- Decimals Cluster ---
    {"id": "place_val_dec", "name": "Place Value of Decimals", "description": "Understanding decimal place values", "prerequisites": []},
    {"id": "read_write_dec", "name": "Reading & Writing Decimals", "description": "Reading and writing decimals in words and numerals", "prerequisites": ["place_val_dec"]},
    {"id": "round_dec", "name": "Rounding Decimals", "description": "Rounding decimals to specified place values", "prerequisites": ["place_val_dec","read_write_dec"]},
    {"id": "compare_order_dec", "name": "Comparing & Ordering Decimals", "description": "Comparing and ordering decimals", "prerequisites": ["place_val_dec","read_write_dec"]},
    {"id": "visual_addsub_dec", "name": "Visualizing Addition/Subtraction of Decimals", "description": "Using visuals to understand decimal addition and subtraction", "prerequisites": ["place_val_dec","read_write_dec"]},
    {"id": "add_sub_dec", "name": "Adding & Subtracting Decimals", "description": "Performing decimal addition and subtraction", "prerequisites": ["visual_addsub_dec"]},
    {"id": "estimate_sumdiff_dec", "name": "Estimating Sum/Difference of Decimals", "description": "Estimating sums and differences of decimals", "prerequisites": ["round_dec","add_sub_dec"]},
    {"id": "prob_solve_addsub_dec", "name": "Problem Solving (Add/Sub Decimals, incl. Money)", "description": "Solving word problems involving decimal addition/subtraction including money", "prerequisites": ["add_sub_dec","estimate_sumdiff_dec"]},
    {"id": "create_prob_addsub_dec", "name": "Creating Problems (Add/Sub Decimals, incl. Money)", "description": "Creating word problems involving decimal addition/subtraction including money", "prerequisites": ["prob_solve_addsub_dec"]},

    # --- Multiplication of Decimals ---
    {"id": "visual_mult_dec", "name": "Visualizing Multiplication of Decimals", "description": "Using visuals to understand decimal multiplication", "prerequisites": ["place_val_dec","read_write_dec"]},
    {"id": "mult_dec_whole_num", "name": "Multiplying Decimals by Whole Numbers", "description": "Performing multiplication of decimals by whole numbers", "prerequisites": ["visual_mult_dec"]},
    {"id": "mult_dec", "name": "Multiplying Decimals", "description": "Multiplying decimals with up to 2 decimal places", "prerequisites": ["mult_dec_whole_num"]},
    {"id": "estimate_prod_dec", "name": "Estimating Products of Decimals", "description": "Estimating decimal products", "prerequisites": ["round_dec","mult_dec"]},
    {"id": "prob_solve_mult_dec", "name": "Problem Solving (Multiplication + Decimals/Whole Numbers incl. Money)", "description": "Solving word problems involving decimal multiplication including money", "prerequisites": ["mult_dec","estimate_prod_dec"]},

    # --- Division of Decimals ---
    {"id": "visual_div_dec", "name": "Visualizing Division of Decimals", "description": "Using visuals to understand decimal division", "prerequisites": ["place_val_dec","read_write_dec"]},
    {"id": "div_dec", "name": "Dividing Decimals", "description": "Dividing decimals up to 2 decimal places", "prerequisites": ["visual_div_dec"]},
    {"id": "div_whole_num_dec_quot", "name": "Dividing Whole Numbers with Decimal Quotients", "description": "Dividing whole numbers resulting in decimal quotients", "prerequisites": ["div_dec"]},
    {"id": "estimate_quot_dec", "name": "Estimating Quotients of Decimals", "description": "Estimating decimal quotients", "prerequisites": ["round_dec","div_dec"]},
    {"id": "prob_solve_div_dec", "name": "Problem Solving (Division + Decimals/Whole Numbers incl. Money)", "description": "Solving word problems involving decimal division including money", "prerequisites": ["div_whole_num_dec_quot","estimate_quot_dec"]},
    {"id": "create_prob_multdiv_dec", "name": "Creating Problems (Multiplication/Division with Decimals & Whole Numbers incl. Money)", "description": "Creating problems involving decimal multiplication and division including money", "prerequisites": ["prob_solve_mult_dec","prob_solve_div_dec"]},

    # --- Ratios & Proportion ---
    {"id": "visual_ratio", "name": "Visualizing Ratios", "description": "Understanding ratios using visuals", "prerequisites": []},
    {"id": "express_ratio", "name": "Expressing Ratio", "description": "Writing ratios in colon or fraction form", "prerequisites": ["visual_ratio"]},
    {"id": "equiv_ratio", "name": "Equivalent Ratios", "description": "Finding and understanding equivalent ratios", "prerequisites": ["express_ratio"]},
    {"id": "simplify_ratio", "name": "Simplifying Ratios", "description": "Simplifying ratios to their lowest form", "prerequisites": ["equiv_ratio"]},
    {"id": "find_missing_term_ratio", "name": "Finding Missing Term in Equivalent Ratios", "description": "Finding missing terms in equivalent ratios", "prerequisites": ["equiv_ratio","simplify_ratio"]},
    {"id": "def_desc_prop", "name": "Defining & Describing Proportion", "description": "Understanding and defining proportions", "prerequisites": ["find_missing_term_ratio"]},
    {"id": "recog_dir_prop", "name": "Recognizing Direct Proportion", "description": "Recognizing direct proportion in problems", "prerequisites": ["def_desc_prop"]}
]

def seed_topics():
    for topic in topics:
        db.collection("topics").document(topic["id"]).set(topic)
    print("Topics seeded successfully!")

if __name__ == "__main__":
    seed_topics()

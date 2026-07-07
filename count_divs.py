import sys

def main():
    filename = 'frontend/src/pages/WorkoutTemplates.jsx'
    with open(filename, 'r') as f:
        lines = f.readlines()

    div_count = 0
    main_count = 0
    for i, line in enumerate(lines):
        # Ignore comments
        clean_line = line.split('{/*')[0].split('//')[0]

        d_opens = clean_line.count('<div')
        d_closes = clean_line.count('</div')
        m_opens = clean_line.count('<main')
        m_closes = clean_line.count('</main')

        if d_opens or d_closes or m_opens or m_closes:
            div_count += d_opens
            div_count -= d_closes
            main_count += m_opens
            main_count -= m_closes
            print(f"Line {i+1}: D:{div_count} M:{main_count} | {line.strip()}")

main()

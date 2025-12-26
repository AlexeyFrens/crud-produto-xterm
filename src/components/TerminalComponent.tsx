import {Terminal} from 'xterm';
import {useEffect, useRef} from "react";
import 'xterm/css/xterm.css';

import './TerminalComponent.css';
import {
    createProduct,
    deleteProduct,
    getCurrentId,
    getProduct,
    getProducts,
    increaseId,
    updateProduct
} from "../core/services/ProductService.ts";
import type {Product} from "../core/types/type.ts";

const TerminalComponent = () => {

    const ANSI = {
        reset: "\x1B[0m",
        bold: "\x1b[1m",
        italic: "\x1b[3m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        brightCyan: "\x1b[36m",
        brightGreen: "\x1b[32m",
    }

    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const xterm = new Terminal({
            cursorBlink: true,
        });

        requestAnimationFrame(() => {
            if (terminalRef.current) {
                terminalRef.current.innerHTML = '';

                xterm.open(terminalRef.current);
                xterm.resize(105, 25);
                xterm.write(`Bem vindo ao Terminal ${ANSI.bold}${ANSI.yellow}Amazonic Products${ANSI.reset}\r\n\n$ `);
            }
        });

        let command = '';

        const onDataListener = xterm.onData(async e => {
            switch (e) {
                case '\r':
                    xterm.write('\r\n');
                    await processCommand(command, xterm);
                    command = '';
                    xterm.write('\r\n$ ');
                    break;
                case '\u007F':
                    if (command.length > 0) {
                        command = command.slice(0, -1);
                        xterm.write('\b \b')
                    }
                    break;
                default:
                    command += e;
                    xterm.write(e);
            }
        })

        const processCommand = async (command: string, term: Terminal) => {
            const cleanCmd = command.trim();
            if (cleanCmd.toLowerCase() === 'help') {
                term.write('\r\nComandos do Sistema:\r\n\n')
                listCommands(term)
            } else if (cleanCmd.toLowerCase() === 'clear') {
                term.clear();
            } else if (cleanCmd.toLowerCase() === 'date') {
                term.write(new Date().toLocaleString());
            } else if (cleanCmd.toLowerCase() === 'reset') {
                window.location.reload();
            } else if (cleanCmd.toLowerCase() === 'listar') {
                await listProducts(term)
            } else if (cleanCmd.startsWith('procurar -id')) {
                const fields: string[] = cleanCmd.split(' ')
                const id = fields[fields.length - 1];

                await findProduct(term, id);
            } else if (cleanCmd.startsWith('criar') && cleanCmd.includes('-nome')
                && cleanCmd.includes('-preco') && cleanCmd.includes('-avaliacao')) {

                const values: string[] = getValuesToCreate(cleanCmd);

                await processCreateProduct(term, values[0], values[1], values[2])
            } else if (cleanCmd.startsWith('alterar -id') || cleanCmd.includes('-nome')
                || cleanCmd.includes('-preco') || cleanCmd.includes('-avaliacao')) {

                const values: string[] = getValuesToUpdate(cleanCmd);

                await processUpdateProduct(term, values[0], values[1], values[2], values[3])
            } else if (cleanCmd.startsWith('deletar -id')) {
                const fields: string[] = cleanCmd.split(' ')
                const id = fields[fields.length - 1]

                await processDeleteProduct(term, id);
            } else if (cleanCmd !== '') {
                term.write(`${ANSI.bold}${ANSI.red}Comando não reconhecido: ${cleanCmd}${ANSI.reset}`);
            }
        }

        const listProducts = async (term: Terminal) => {
            const products = await getProducts()
            const id = "ID", name = "NOME", price = "PREÇO", rating = "NOTA";

            term.write("\r\n+----------------------------------------------------------------------------------------+\r\n")
            term.write(`| ${id.padEnd(5)} | ${name.padEnd(50)} | ${price.padEnd(18)} | ${rating.padEnd(5)}|\r\n`)
            term.write("+----------------------------------------------------------------------------------------+\r\n")

            for (const product of products) {
                let productData = `|${String(product.id).padEnd(6)} | ${product.name.padEnd(50)} | R$ ${product.price.toFixed(2).toString().padEnd(15)} | ${String(product.rating).padEnd(5)}|\r\n`
                term.write(productData);
                productData = ``;
            }

            term.write("+----------------------------------------------------------------------------------------+\r\n")
        }

        const findProduct = async (term: Terminal, id: string) => {
            const parsedId = Number(id)

            if (isNaN(parsedId)) {
                term.write(`${ANSI.bold}${ANSI.red}Erro: o ID = ${id} está com o formato incorreto. Tente novamente fornecendo apenas números${ANSI.reset}`)
                return
            }

            try {
                const product = await getProduct(String(parsedId))

                term.write(`\r\n${ANSI.bold}${ANSI.brightGreen}Produto encontrado!${ANSI.reset}\r\n\n`)
                term.write(`ID: ${product.id}\r\n`)
                term.write(`NOME: ${product.name}\r\n`)
                term.write(`PREÇO: R$ ${product.price.toFixed(2)}\r\n`)
                term.write(`AVALIAÇÃO: ${product.rating}\r\n`)
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Produto não encontrado ou erro de conexão!${ANSI.reset}`);
                console.error(err);
            }

        }

        const processCreateProduct = async (term: Terminal, newName: string, newPrice: string, newRating: string) => {
            const parsedPrice = Number(newPrice)
            const parsedRating = Number(newRating)
            let newId: number = 0

            if (isNaN(parsedPrice) || isNaN(parsedRating)) {
                term.write(`${ANSI.bold}${ANSI.red}Erro: Valor(es) com o formato inválido. Preço e avaliação precisam ser números!${ANSI.reset}`);
                return
            }

            try {
                const response = await getCurrentId();
                newId = ++response[0].nowId;
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Erro ao encontrar id atual. Entre em contato com o administrador do sistema.${ANSI.reset}`);
                console.log(err);
                return
            }

            try {
                const productToCreate: Product = {
                    id: String(newId),
                    name: newName,
                    price: parsedPrice,
                    rating: parsedRating
                }

                const response = await createProduct(productToCreate)

                if (response.status === 200 || response.status === 201) {
                    term.write(`${ANSI.bold}${ANSI.brightGreen}Produto cadastrado com sucesso!${ANSI.reset}`);
                }
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Erro ao cadastrar produto. Entre em contato com o administrador do sistema.${ANSI.reset}`);
                console.log(err);
            }

            try {
                await increaseId(newId)
            } catch (error) {
                term.write(`\r\n${ANSI.bold}${ANSI.red}ATENÇÃO! Erro ao incrementar ID. Entre em contato com o administrador imediatamente!${ANSI.reset}`)
                console.log(error);
            }
        }

        const processUpdateProduct = async (term: Terminal, productId: string,
                                            possibleNewName: string, possibleNewPrice: string, possibleNewRating: string) => {
            const parsedPrice = Number(possibleNewPrice)
            const parsedRating = Number(possibleNewRating)
            let currentProduct: Product

            if (isNaN(parsedPrice) || isNaN(parsedRating)) {
                term.write(`${ANSI.bold}${ANSI.red}Erro: Valor(es) com o formato inválido. Preço e avaliação precisam ser números!${ANSI.reset}`);
                return
            }

            try {

                const response = await getProduct(productId)

                currentProduct = {
                    id: productId,
                    name: response.name,
                    price: response.price,
                    rating: response.rating,
                }
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Produto com o ID ${productId} não foi encontrado!${ANSI.reset}`);
                console.log(err);
                return
            }

            try {
                const productToUpdate: Product = {
                    id: currentProduct.id,
                    name: (possibleNewName !== '-1' ? possibleNewName : currentProduct.name),
                    price: (parsedPrice !== -1 ? parsedPrice : currentProduct.price),
                    rating: (parsedRating !== -1 ? parsedRating : currentProduct.rating),
                }

                const response = await updateProduct(productToUpdate)

                if (response.status === 200) {
                    term.write(`${ANSI.bold}${ANSI.brightGreen}Produto atualizado com sucesso!${ANSI.reset}`);
                }
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Erro ao atualizar produto. Entre em contato com o administrador do sistema.${ANSI.reset}`);
                console.log(err);
            }
        }

        const processDeleteProduct = async (term: Terminal, productId: string) => {
            let productToDelete

            try {
                productToDelete = await getProduct(productId);

                term.write(`${ANSI.bold}${ANSI.yellow}Produto a ser deletado:${ANSI.reset}\r\n\n`);
                term.write(`${ANSI.bold}${ANSI.brightCyan}ID: ${ANSI.reset}${productToDelete.id}\r\n`)
                term.write(`${ANSI.bold}${ANSI.brightCyan}NOME: ${ANSI.reset}${productToDelete.name}\r\n`)
                term.write(`${ANSI.bold}${ANSI.brightCyan}PREÇO: ${ANSI.reset}${productToDelete.price}\r\n`)
                term.write(`${ANSI.bold}${ANSI.brightCyan}AVALIAÇÃO: ${ANSI.reset}${productToDelete.rating}\r\n\n`)

                term.write(`${ANSI.bold}${ANSI.yellow}Deseja realmente deletar o produto com o ID ${productToDelete.id} (s/n)?${ANSI.reset} `);
            } catch {
                term.write(`${ANSI.bold}${ANSI.red}Erro: Produto com o ID: ${productId} não foi encontrado!${ANSI.reset}`);
                return
            }

            const readyToDelete = await checkDeleteCondition(term);

            if (readyToDelete) {
                try {
                    await deleteProduct(productId)

                    term.write(`\r\n\n${ANSI.bold}${ANSI.brightGreen}Produto excluído com sucesso!${ANSI.reset}\r\n\n`);
                } catch (e) {
                    term.write(`${ANSI.bold}${ANSI.red}Erro ao excluir o produto. Entre em contato com o administrador${ANSI.reset}`);
                    console.log(e)
                }
            } else {
                term.write(`\r\n\n${ANSI.bold}${ANSI.red}Operação cancelada!${ANSI.reset}\r\n\n`);
            }
        }

        const checkDeleteCondition = async (term: Terminal): Promise<boolean> => {
            return new Promise((resolve) => {
                const disposable = xterm.onData(e => {
                    const char = e.toLowerCase()
                    if (char === 's') {
                        disposable.dispose()
                        resolve(true)
                    } else if (char === 'n') {
                        disposable.dispose()
                        resolve(false)
                    } else {
                        term.write(`\r\n${ANSI.bold}${ANSI.yellow}Por favor, digite apenas [s/n]:${ANSI.reset} `);
                    }
                })
            })
        }

        const getValuesToCreate = (command: string) => {
            const values: string[] = []
            const fields: string[] = command.split(' ')
            let name = "", currentIndex = 2

            for (let i = 2; fields[i] !== '-preco'; i++) {
                name += `${fields[i]} `;
                currentIndex++
            }

            values[0] = name.slice(0, -1);
            currentIndex++
            values[1] = fields[currentIndex];
            currentIndex += 2
            values[2] = fields[currentIndex];

            return values;
        }

        const getValuesToUpdate = (command: string) => {
            const values: string[] = []
            const fields: string[] = command.split(' ')
            let name = "", currentIndex = 2

            values[0] = fields[currentIndex];
            currentIndex += 2;

            for (let i = 4; fields[i] !== '-preco'; i++) {
                name += `${fields[i]} `;
                currentIndex++
            }

            values[1] = name.slice(0, -1);
            currentIndex++
            values[2] = fields[currentIndex];
            currentIndex += 2
            values[3] = fields[currentIndex];

            return values;
        }

        const listCommands = (term: Terminal) => {
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"help".padEnd(11)}${ANSI.reset}`)
            term.write(" Mostra os comandos do sistema\r\n")

            //Comando clear
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"clear".padEnd(11)}${ANSI.reset}`)
            term.write(" Limpa o terminal de comando\r\n")

            //Comando date
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"date".padEnd(11)}${ANSI.reset}`)
            term.write(" Mostra a data e hora atual\r\n")

            //Comando reset
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"reset".padEnd(11)}${ANSI.reset}`)
            term.write(" Recarrega a página, recarregando automaticamente o terminal\r\n")

            //Comando listar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"listar".padEnd(11)}${ANSI.reset}`)
            term.write(" Lista os produtos cadastrados\r\n")

            //Comando procurar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"procurar".padEnd(11)}${ANSI.reset}`)
            term.write(" Mostra um produto específico pelo ID fornecido\r\n")

            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-id".padStart(20).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o ID do produto à ser procurado. ${ANSI.yellow}Exemplo: procurar -id 1${ANSI.reset}\r\n`)

            //Comando criar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"criar".padEnd(11)}${ANSI.reset}`)
            term.write(" Cadastra um novo produto. Obrigatoriamente deve-se usar da seguinte forma:\r\n")
            term.write(`${ANSI.yellow}${"criar".padStart(17)}${ANSI.reset}`)
            term.write(`${ANSI.yellow} -nome *nome* -preco *preco* -avaliacao *avaliacao${ANSI.reset}\r\n`)

            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-nome".padStart(22).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o nome do produto.\r\n`)
            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-preco".padStart(23).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o preço do produto. Obrigatório apenas números. ${ANSI.yellow}Exemplo: 199.99${ANSI.reset}\r\n`)
            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-avaliacao".padStart(27).padEnd(10)}${ANSI.reset}`)
            term.write(` Indica a nota/avaliação do produto. Obrigatório apenas números. ${ANSI.yellow}Exemplo: 4.5${ANSI.reset}\r\n`)

            //Comando atualizar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"atualizar".padEnd(11)}${ANSI.reset}`)
            term.write(" Atualiza um produto já existente. Obrigatoriamente deve-se usar da seguinte forma:\r\n")
            term.write(`${ANSI.yellow}${"atualizar".padStart(21)}${ANSI.reset}`)
            term.write(`${ANSI.yellow} -id *id* -nome *nome* -preco *preco* -avaliacao *avaliacao${ANSI.reset}\r\n`)

            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-id".padStart(20).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o ID do produto à ser atualizado.\r\n`)
            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-nome".padStart(22).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o nome do produto.\r\n`)
            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-preco".padStart(23).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o preço do produto. Obrigatório apenas números. ${ANSI.yellow}Exemplo: 199.99${ANSI.reset}\r\n`)
            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-avaliacao".padStart(27).padEnd(10)}${ANSI.reset}`)
            term.write(` Indica a nota/avaliação do produto. Obrigatório apenas números. ${ANSI.yellow}Exemplo: 4.5${ANSI.reset}\r\n`)
            term.write(`${ANSI.bold}${ANSI.red}${"Para".padStart(21)}${ANSI.reset}`)
            term.write(`${ANSI.bold}${ANSI.red} indicar um campo que não será atualizado digite -1. Exemplo: -nome -1${ANSI.reset}\r\n`)

            //Comando deletar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"deletar".padEnd(11)}${ANSI.reset}`)
            term.write(" Deleta um produto específico pelo ID fornecido\r\n")

            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-id".padStart(20).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o ID do produto à ser excluído. ${ANSI.yellow}Exemplo: deletar -id 1${ANSI.reset}\r\n`)
        }

        return () => {
            onDataListener.dispose()
            xterm.dispose();
        };
    }, [])

    return (
        <>
            <section className="terminal-container">
                <h1>Terminal Administrativo de Produtos</h1>

                <div id={'terminal'} ref={terminalRef}></div>
            </section>
        </>
    );
};

export default TerminalComponent;
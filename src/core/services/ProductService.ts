import axios from 'axios';
import type {Product} from "../types/type.ts";

const ENDPOINT = "/products"
const METAENDPOINT = "/metadata"

const API = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    }
})

export const getProducts = async (): Promise<Product[]> => {
    try {
        const response = await API.get<Product[]>(ENDPOINT);
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao buscar lista de produtos: ${error}`);
    }
}

export const getProduct = async (id: string): Promise<Product> => {
    try {
        const response = await API.get(`${ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao buscar produto com id: ${id} \r\n\n${error}`);
    }
}

export const getCurrentId = async () => {
    try {
        const response = await API.get(`${METAENDPOINT}`);
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao buscar id atual: ${error}`);
    }
}

export const increaseId = async (id: number) => {
    try {
        const newMetadata = {
            nowId: id
        }
        await API.put(`${METAENDPOINT}/1`, newMetadata);
    } catch (error) {
        throw new Error(`Erro ao incrementar id: ${error}`);
    }
}

export const createProduct = async (product: Product) => {
    try {
        return await API.post(`${ENDPOINT}`, product);
    } catch (error) {
        throw new Error(`Erro ao cadastrar produto: ${error}`);
    }
}

export const updateProduct = async (product: Product) => {

    const productToUpdate = await getProduct(product.id!)

    try {
        return await API.put(`${ENDPOINT}/${productToUpdate.id}`, product);
    } catch (error) {
        throw new Error(`Erro ao atualizar produto: ${error}`);
    }
}

export const deleteProduct = async (id: string) => {

    const productToDelete = await getProduct(id);

    try {
        return await API.delete(`${ENDPOINT}/${productToDelete.id}`);
    } catch (error) {
        throw new Error(`Erro ao remover produto: ${error}`);
    }
}